#!/usr/bin/env python3
"""
Simple OSM Bar Data Downloader
A more focused approach to downloading bar data from OpenStreetMap

Usage: 
    python3 download_bars_simple.py                    # Download by major cities
    python3 download_bars_simple.py --global           # Try global download (risky)
    python3 download_bars_simple.py --region sf        # Download specific region
"""

import requests
import json
import time
import sys
import argparse

def make_overpass_request(query, timeout=180):
    """Make request to Overpass API"""
    url = "https://overpass-api.de/api/interpreter"
    
    try:
        print(f"Making request to Overpass API...")
        response = requests.post(
            url,
            data={'data': query},
            timeout=timeout,
            headers={'User-Agent': 'BeerCompass/1.0'}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
            return None
            
    except requests.exceptions.Timeout:
        print("Request timed out. Try with a smaller region.")
        return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def process_elements(elements):
    """Process OSM elements into bar format"""
    bars = []
    
    for element in elements:
        # Get coordinates
        lat = lon = None
        if element['type'] == 'node':
            lat = element['lat']
            lon = element['lon']
        elif element['type'] in ['way', 'relation']:
            if 'center' in element:
                lat = element['center']['lat']
                lon = element['center']['lon']
        
        if not lat or not lon:
            continue
        
        # Get tags
        tags = element.get('tags', {})
        name = tags.get('name') or tags.get('name:en') or 'Unnamed Bar'
        
        # Determine type
        amenity = tags.get('amenity', 'bar')
        bar_type = 'bar'
        if amenity == 'pub':
            bar_type = 'pub'
        elif amenity == 'biergarten':
            bar_type = 'biergarten'
        
        bars.append({
            'id': element['id'],
            'name': name,
            'type': bar_type,
            'lat': lat,
            'lon': lon,
            'tags': tags
        })
    
    return bars

def get_query_for_region(region=None, timeout=180):
    """Get Overpass query for specific region or global"""
    
    if region == 'global':
        # Global query - very risky, likely to timeout
        query = f"""
[out:json][timeout:{timeout}];
(
  node["amenity"="bar"];
  node["amenity"="pub"];
  node["amenity"="biergarten"];
  way["amenity"="bar"];
  way["amenity"="pub"];
  way["amenity"="biergarten"];
);
out center meta;
"""
    elif region == 'sf':
        # San Francisco Bay Area
        bbox = "37.4,-122.8,38.2,-121.8"
        query = f"""
[out:json][timeout:{timeout}];
(
  node["amenity"="bar"]({bbox});
  node["amenity"="pub"]({bbox});
  node["amenity"="biergarten"]({bbox});
  way["amenity"="bar"]({bbox});
  way["amenity"="pub"]({bbox});
  way["amenity"="biergarten"]({bbox});
);
out center meta;
"""
    elif region == 'nyc':
        # New York City
        bbox = "40.5,-74.3,40.9,-73.7"
        query = f"""
[out:json][timeout:{timeout}];
(
  node["amenity"="bar"]({bbox});
  node["amenity"="pub"]({bbox});
  node["amenity"="biergarten"]({bbox});
  way["amenity"="bar"]({bbox});
  way["amenity"="pub"]({bbox});
  way["amenity"="biergarten"]({bbox});
);
out center meta;
"""
    elif region == 'london':
        # London
        bbox = "51.3,-0.6,51.7,0.2"
        query = f"""
[out:json][timeout:{timeout}];
(
  node["amenity"="bar"]({bbox});
  node["amenity"="pub"]({bbox});
  node["amenity"="biergarten"]({bbox});
  way["amenity"="bar"]({bbox});
  way["amenity"="pub"]({bbox});
  way["amenity"="biergarten"]({bbox});
);
out center meta;
"""
    else:
        # Major cities combined query
        query = f"""
[out:json][timeout:{timeout}];
(
  // San Francisco
  node["amenity"="bar"](37.4,-122.8,38.2,-121.8);
  node["amenity"="pub"](37.4,-122.8,38.2,-121.8);
  node["amenity"="biergarten"](37.4,-122.8,38.2,-121.8);
  
  // New York City
  node["amenity"="bar"](40.5,-74.3,40.9,-73.7);
  node["amenity"="pub"](40.5,-74.3,40.9,-73.7);
  node["amenity"="biergarten"](40.5,-74.3,40.9,-73.7);
  
  // London
  node["amenity"="bar"](51.3,-0.6,51.7,0.2);
  node["amenity"="pub"](51.3,-0.6,51.7,0.2);
  node["amenity"="biergarten"](51.3,-0.6,51.7,0.2);
  
  // Berlin
  node["amenity"="bar"](52.3,13.0,52.7,13.8);
  node["amenity"="pub"](52.3,13.0,52.7,13.8);
  node["amenity"="biergarten"](52.3,13.0,52.7,13.8);
  
  // Tokyo
  node["amenity"="bar"](35.5,139.4,35.8,139.9);
  node["amenity"="pub"](35.5,139.4,35.8,139.9);
  node["amenity"="biergarten"](35.5,139.4,35.8,139.9);
  
  // Sydney
  node["amenity"="bar"](-33.9,151.1,-33.7,151.4);
  node["amenity"="pub"](-33.9,151.1,-33.7,151.4);
  node["amenity"="biergarten"](-33.9,151.1,-33.7,151.4);
  
  // Paris
  node["amenity"="bar"](48.8,2.2,48.9,2.5);
  node["amenity"="pub"](48.8,2.2,48.9,2.5);
  node["amenity"="biergarten"](48.8,2.2,48.9,2.5);
  
  // Ways for all regions
  way["amenity"="bar"](37.4,-122.8,38.2,-121.8);
  way["amenity"="pub"](37.4,-122.8,38.2,-121.8);
  way["amenity"="biergarten"](37.4,-122.8,38.2,-121.8);
  way["amenity"="bar"](40.5,-74.3,40.9,-73.7);
  way["amenity"="pub"](40.5,-74.3,40.9,-73.7);
  way["amenity"="biergarten"](40.5,-74.3,40.9,-73.7);
  way["amenity"="bar"](51.3,-0.6,51.7,0.2);
  way["amenity"="pub"](51.3,-0.6,51.7,0.2);
  way["amenity"="biergarten"](51.3,-0.6,51.7,0.2);
  way["amenity"="bar"](52.3,13.0,52.7,13.8);
  way["amenity"="pub"](52.3,13.0,52.7,13.8);
  way["amenity"="biergarten"](52.3,13.0,52.7,13.8);
  way["amenity"="bar"](35.5,139.4,35.8,139.9);
  way["amenity"="pub"](35.5,139.4,35.8,139.9);
  way["amenity"="biergarten"](35.5,139.4,35.8,139.9);
  way["amenity"="bar"](-33.9,151.1,-33.7,151.4);
  way["amenity"="pub"](-33.9,151.1,-33.7,151.4);
  way["amenity"="biergarten"](-33.9,151.1,-33.7,151.4);
  way["amenity"="bar"](48.8,2.2,48.9,2.5);
  way["amenity"="pub"](48.8,2.2,48.9,2.5);
  way["amenity"="biergarten"](48.8,2.2,48.9,2.5);
);
out center meta;
"""
    
    return query.strip()

def main():
    parser = argparse.ArgumentParser(description='Download bar data from OpenStreetMap')
    parser.add_argument('--region', choices=['sf', 'nyc', 'london', 'global'], 
                       default=None, help='Specific region to download')
    parser.add_argument('--global', dest='global_download', action='store_true',
                       help='Try global download (risky - may timeout)')
    parser.add_argument('--output', default='bars_data.json',
                       help='Output filename')
    parser.add_argument('--timeout', type=int, default=180,
                       help='Request timeout in seconds')
    
    args = parser.parse_args()
    
    print("🍺 Beer Compass - OSM Bar Data Downloader")
    print("=" * 50)
    
    # Determine query type
    if args.global_download:
        region = 'global'
        print("⚠️  WARNING: Global download may timeout or take a very long time!")
    elif args.region:
        region = args.region
        print(f"Downloading data for region: {region}")
    else:
        region = None
        print("Downloading data for major cities (SF, NYC, London, Berlin, Tokyo, Sydney, Paris)")
    
    # Get query
    query = get_query_for_region(region, args.timeout)
    print(f"Query timeout: {args.timeout} seconds")
    
    # Make request
    data = make_overpass_request(query, args.timeout)
    
    if data is None:
        print("❌ Failed to download data")
        sys.exit(1)
    
    elements = data.get('elements', [])
    print(f"✅ Received {len(elements)} elements from Overpass API")
    
    # Process elements
    bars = process_elements(elements)
    print(f"✅ Processed {len(bars)} valid bars/pubs/biergartens")
    
    # Save to file
    output_data = {
        "meta": {
            "generated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "total": len(bars),
            "source": "OpenStreetMap via Overpass API",
            "license": "ODbL (OpenStreetMap)",
            "region": region or "major_cities"
        },
        "bars": bars
    }
    
    print(f"💾 Saving to {args.output}...")
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    file_size_mb = len(json.dumps(output_data)) / 1024 / 1024
    print(f"✅ Saved {args.output} ({file_size_mb:.2f} MB)")
    print(f"🎉 Successfully downloaded {len(bars)} bars/pubs/biergartens!")

if __name__ == "__main__":
    main()
