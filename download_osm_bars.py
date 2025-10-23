#!/usr/bin/env python3
"""
OpenStreetMap Bar Data Downloader
Downloads all bars, pubs, and biergartens worldwide from OpenStreetMap via Overpass API

Usage: python3 download_osm_bars.py
"""

import requests
import json
import time
import sys
from typing import List, Dict, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OSMBarDownloader:
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        self.timeout = 300  # 5 minutes timeout
        self.max_retries = 3
        self.delay_between_requests = 2  # seconds
        
    def generate_overpass_query(self, bbox=None) -> str:
        """Generate Overpass QL query for bars/pubs/biergartens"""
        if bbox:
            # Query for specific bounding box
            query = f"""
[out:json][timeout:{self.timeout}];
(
  node["amenity"="bar"]({bbox});
  node["amenity"="pub"]({bbox});
  node["amenity"="biergarten"]({bbox});
  way["amenity"="bar"]({bbox});
  way["amenity"="pub"]({bbox});
  way["amenity"="biergarten"]({bbox});
  relation["amenity"="bar"]({bbox});
  relation["amenity"="pub"]({bbox});
  relation["amenity"="biergarten"]({bbox});
);
out center meta;
"""
        else:
            # Global query (may timeout for very large datasets)
            query = f"""
[out:json][timeout:{self.timeout}];
(
  node["amenity"="bar"];
  node["amenity"="pub"];
  node["amenity"="biergarten"];
  way["amenity"="bar"];
  way["amenity"="pub"];
  way["amenity"="biergarten"];
  relation["amenity"="bar"];
  relation["amenity"="pub"];
  relation["amenity"="biergarten"];
);
out center meta;
"""
        return query.strip()
    
    def make_overpass_request(self, query: str) -> Dict[str, Any]:
        """Make request to Overpass API with retry logic"""
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Making Overpass request (attempt {attempt + 1}/{self.max_retries})")
                
                response = requests.post(
                    self.overpass_url,
                    data={'data': query},
                    timeout=self.timeout,
                    headers={'User-Agent': 'BeerCompass/1.0 (https://github.com/your-repo)'}
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # Rate limited
                    wait_time = 60 * (attempt + 1)
                    logger.warning(f"Rate limited. Waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"HTTP {response.status_code}: {response.text}")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Request timeout (attempt {attempt + 1})")
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {e}")
            
            if attempt < self.max_retries - 1:
                wait_time = self.delay_between_requests * (2 ** attempt)
                logger.info(f"Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
        
        raise Exception("Failed to get data from Overpass API after all retries")
    
    def process_element(self, element: Dict[str, Any]) -> Dict[str, Any]:
        """Process OSM element into our bar format"""
        # Get coordinates
        lat = lon = None
        if element['type'] == 'node':
            lat = element['lat']
            lon = element['lon']
        elif element['type'] in ['way', 'relation']:
            if 'center' in element:
                lat = element['center']['lat']
                lon = element['center']['lon']
        
        # Skip if no coordinates
        if not lat or not lon:
            return None
        
        # Get tags
        tags = element.get('tags', {})
        
        # Get name
        name = tags.get('name') or tags.get('name:en') or 'Unnamed Establishment'
        
        # Determine type
        amenity = tags.get('amenity', 'bar')
        if amenity == 'bar':
            bar_type = 'bar'
        elif amenity == 'pub':
            bar_type = 'pub'
        elif amenity == 'biergarten':
            bar_type = 'biergarten'
        else:
            bar_type = 'bar'  # fallback
        
        return {
            'id': element['id'],
            'name': name,
            'type': bar_type,
            'lat': lat,
            'lon': lon,
            'tags': tags
        }
    
    def download_global_data(self) -> List[Dict[str, Any]]:
        """Download all bars/pubs/biergartens globally"""
        logger.info("Starting global download of all bars/pubs/biergartens...")
        logger.warning("This may take a very long time and might timeout. Consider using regional downloads instead.")
        
        try:
            query = self.generate_overpass_query()
            logger.info("Executing global query...")
            data = self.make_overpass_request(query)
            
            logger.info(f"Received {len(data.get('elements', []))} elements from Overpass API")
            
            # Process elements
            bars = []
            for element in data.get('elements', []):
                processed = self.process_element(element)
                if processed:
                    bars.append(processed)
            
            logger.info(f"Processed {len(bars)} valid bars/pubs/biergartens")
            return bars
            
        except Exception as e:
            logger.error(f"Global download failed: {e}")
            return []
    
    def download_by_regions(self) -> List[Dict[str, Any]]:
        """Download data by major regions to avoid timeouts"""
        # Define major regions (bounding boxes)
        regions = [
            {"name": "North America", "bbox": "-180,15,-50,85"},
            {"name": "Europe", "bbox": "-25,35,45,75"},
            {"name": "Asia", "bbox": "60,5,180,55"},
            {"name": "Australia/Oceania", "bbox": "110,-50,180,-10"},
            {"name": "South America", "bbox": "-85,-60,-30,15"},
            {"name": "Africa", "bbox": "-20,-40,60,40"}
        ]
        
        all_bars = []
        
        for region in regions:
            logger.info(f"Downloading data for {region['name']}...")
            
            try:
                query = self.generate_overpass_query(region['bbox'])
                data = self.make_overpass_request(query)
                
                logger.info(f"Received {len(data.get('elements', []))} elements for {region['name']}")
                
                # Process elements
                region_bars = []
                for element in data.get('elements', []):
                    processed = self.process_element(element)
                    if processed:
                        region_bars.append(processed)
                
                logger.info(f"Processed {len(region_bars)} bars for {region['name']}")
                all_bars.extend(region_bars)
                
                # Delay between regions to be nice to the API
                time.sleep(self.delay_between_requests)
                
            except Exception as e:
                logger.error(f"Failed to download {region['name']}: {e}")
                continue
        
        return all_bars
    
    def download_by_countries(self) -> List[Dict[str, Any]]:
        """Download data by major countries"""
        # Major countries with significant bar populations
        countries = [
            {"name": "United States", "bbox": "-125,25,-66,50"},
            {"name": "United Kingdom", "bbox": "-8,50,2,61"},
            {"name": "Germany", "bbox": "5,47,15,55"},
            {"name": "France", "bbox": "-5,42,9,51"},
            {"name": "Spain", "bbox": "-9,36,4,44"},
            {"name": "Italy", "bbox": "6,36,19,47"},
            {"name": "Japan", "bbox": "129,31,146,46"},
            {"name": "Australia", "bbox": "113,-44,154,-10"},
            {"name": "Canada", "bbox": "-141,42,-52,84"},
            {"name": "Brazil", "bbox": "-74,-34,-34,6"},
            {"name": "India", "bbox": "68,6,97,37"},
            {"name": "China", "bbox": "73,18,135,54"}
        ]
        
        all_bars = []
        
        for country in countries:
            logger.info(f"Downloading data for {country['name']}...")
            
            try:
                query = self.generate_overpass_query(country['bbox'])
                data = self.make_overpass_request(query)
                
                logger.info(f"Received {len(data.get('elements', []))} elements for {country['name']}")
                
                # Process elements
                country_bars = []
                for element in data.get('elements', []):
                    processed = self.process_element(element)
                    if processed:
                        country_bars.append(processed)
                
                logger.info(f"Processed {len(country_bars)} bars for {country['name']}")
                all_bars.extend(country_bars)
                
                # Delay between countries
                time.sleep(self.delay_between_requests)
                
            except Exception as e:
                logger.error(f"Failed to download {country['name']}: {e}")
                continue
        
        return all_bars
    
    def save_to_file(self, bars: List[Dict[str, Any]], filename: str = "bars_data.json"):
        """Save bars data to JSON file"""
        data = {
            "meta": {
                "generated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "total": len(bars),
                "source": "OpenStreetMap via Overpass API",
                "license": "ODbL (OpenStreetMap)"
            },
            "bars": bars
        }
        
        logger.info(f"Saving {len(bars)} bars to {filename}...")
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        file_size_mb = len(json.dumps(data)) / 1024 / 1024
        logger.info(f"Saved {filename} ({file_size_mb:.2f} MB)")
    
    def run(self, method: str = "countries"):
        """Run the downloader with specified method"""
        logger.info(f"🍺 Starting OSM Bar Data Downloader")
        logger.info(f"Method: {method}")
        
        if method == "global":
            bars = self.download_global_data()
        elif method == "regions":
            bars = self.download_by_regions()
        elif method == "countries":
            bars = self.download_by_countries()
        else:
            raise ValueError("Method must be 'global', 'regions', or 'countries'")
        
        if bars:
            self.save_to_file(bars)
            logger.info(f"✅ Successfully downloaded {len(bars)} bars/pubs/biergartens")
        else:
            logger.error("❌ No data downloaded")
            sys.exit(1)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Download bar/pub data from OpenStreetMap')
    parser.add_argument('--method', choices=['global', 'regions', 'countries'], 
                       default='countries', help='Download method (default: countries)')
    parser.add_argument('--output', default='bars_data.json', 
                       help='Output filename (default: bars_data.json)')
    
    args = parser.parse_args()
    
    downloader = OSMBarDownloader()
    
    try:
        downloader.run(args.method)
    except KeyboardInterrupt:
        logger.info("Download interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Download failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
