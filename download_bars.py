#!/usr/bin/I/python3
"""
Simple Global Bar Downloader with Progress
Downloads ALL bars worldwide from OpenStreetMap
"""

import requests
import json
import time
import os

def download_region(region_name, bbox, timeout=180, max_retries=3):
    """Download bars from a specific region with retry logic"""
    print(f"📍 Downloading {region_name}...")
    
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
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                "https://overpass-api.de/api/interpreter",
                data={'data': query},
                timeout=timeout,
                headers={'User-Agent': 'BeerCompass/1.0'}
            )
            
            if response.status_code == 200:
                data = response.json()
                elements = data.get('elements', [])
                print(f"✅ {region_name}: {len(elements)} elements")
                
                # Save this region's data to a file
                region_filename = f"data/bars_data_{region_name.replace(' ', '_').replace('°', 'deg')}.json"
                with open(region_filename, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                return elements
            elif response.status_code == 504:
                print(f"⚠️  {region_name}: HTTP 504 (Gateway Timeout) - attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 10  # Exponential backoff: 10s, 20s, 30s
                    print(f"⏳ Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"❌ {region_name}: Failed after {max_retries} attempts (504 errors)")
                    return []
            else:
                print(f"❌ {region_name}: HTTP {response.status_code}")
                return []
                
        except requests.exceptions.Timeout:
            print(f"⚠️  {region_name}: Request timeout - attempt {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5  # Shorter wait for timeouts
                print(f"⏳ Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ {region_name}: Failed after {max_retries} attempts (timeouts)")
                return []
        except Exception as e:
            print(f"❌ {region_name}: {e}")
            return []
    
    return []

def download_all_bars():
    print("🍺 Beer Compass - Global Bar Downloader")
    print("=" * 50)
    print("Downloading bars by 10x10 degree blocks worldwide...")
    print("This will take 10-15 minutes but should be reliable...")
    print()
    
    # Define 10x10 degree blocks covering the world
    regions = []
    
    # Generate blocks for the world (lat: -90 to +90, lon: -180 to +180)
    for lat in range(-90, 90, 10):
        for lon in range(-180, 180, 10):
            region_name = f"Block {lat}°N {lon}°E"
            bbox = f"{lat},{lon},{lat+10},{lon+10}"
            regions.append({"name": region_name, "bbox": bbox})
    
    print(f"🌍 Downloading {len(regions)} regions (10x10 degree blocks)")
    print("⏰ Timeout: 3 minutes per region")
    print()
    
    all_elements = []
    successful_regions = 0
    
    for i, region in enumerate(regions):
        print(f"Progress: {i+1}/{len(regions)} regions")
        
        # Check if we already have this region's data
        region_filename = f"data/bars_data_{region['name'].replace(' ', '_').replace('°', 'deg')}.json"
        if os.path.exists(region_filename):
            print(f"⏭️  Skipping {region['name']} (already downloaded)")
            continue
        
        elements = download_region(region["name"], region["bbox"])
        all_elements.extend(elements)
        
        if elements:
            successful_regions += 1
        
        # Add delay between requests to be nice to the API
        print("⏳ Waiting 3 seconds before next request...")
        time.sleep(3)
    
    print(f"\n✅ Downloaded from {successful_regions}/{len(regions)} regions")
    print(f"📊 Total elements: {len(all_elements)}")
    
    if not all_elements:
        print("❌ No data downloaded")
        return 0
    
    # Process all elements
    print("🔄 Processing bars...")
    bars = []
    for i, element in enumerate(all_elements):
        if i % 1000 == 0 and i > 0:
            print(f"   Processed {i} elements...")
        
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
        
        # Get name and type
        tags = element.get('tags', {})
        name = tags.get('name') or 'Unnamed Bar'
        amenity = tags.get('amenity', 'bar')
        bar_type = 'bar' if amenity == 'bar' else ('pub' if amenity == 'pub' else 'biergarten')
        
        bars.append({
            'id': element['id'],
            'name': name,
            'type': bar_type,
            'lat': lat,
            'lon': lon,
            'tags': tags
        })
    
    print(f"✅ Processed {len(bars)} valid bars")
    
    # Save to file
    print("💾 Saving to data/bars_data.json...")
    output = {
        "meta": {
            "generated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "total": len(bars),
            "source": "OpenStreetMap - 10x10 Degree Blocks",
            "license": "ODbL (OpenStreetMap)"
        },
        "bars": bars
    }
    
    with open('data/bars_data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    file_size = len(json.dumps(output)) / 1024 / 1024
    print(f"✅ Saved data/bars_data.json ({file_size:.1f} MB)")
    print(f"🎉 Successfully downloaded {len(bars)} bars worldwide!")
    
    # Show sample bars
    print("\n📊 Sample bars from around the world:")
    for i, bar in enumerate(bars[:10]):
        print(f"{i+1}. {bar['name']} ({bar['type']}) - {bar['lat']:.4f}, {bar['lon']:.4f}")
    
    return len(bars)

def combine_region_files():
    """Combine all region files into the final bars_data.json"""
    print("🔄 Combining all region files...")
    
    all_elements = []
    region_files = [f for f in os.listdir('data') if f.startswith('bars_data_') and f.endswith('.json')]
    
    print(f"Found {len(region_files)} region files")
    
    for region_file in region_files:
        try:
            with open(f"data/{region_file}", 'r', encoding='utf-8') as f:
                data = json.load(f)
                elements = data.get('elements', [])
                all_elements.extend(elements)
                print(f"✅ {region_file}: {len(elements)} elements")
        except Exception as e:
            print(f"❌ Error reading {region_file}: {e}")
    
    if not all_elements:
        print("❌ No elements found in region files")
        return 0
    
    # Process all elements
    print("🔄 Processing bars...")
    bars = []
    for i, element in enumerate(all_elements):
        if i % 1000 == 0 and i > 0:
            print(f"   Processed {i} elements...")
        
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
        
        # Get name and type
        tags = element.get('tags', {})
        name = tags.get('name') or 'Unnamed Bar'
        amenity = tags.get('amenity', 'bar')
        bar_type = 'bar' if amenity == 'bar' else ('pub' if amenity == 'pub' else 'biergarten')
        
        bars.append({
            'id': element['id'],
            'name': name,
            'type': bar_type,
            'lat': lat,
            'lon': lon,
            'tags': tags
        })
    
    print(f"✅ Processed {len(bars)} valid bars")
    
    # Save to file
    print("💾 Saving to data/bars_data.json...")
    output = {
        "meta": {
            "generated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "total": len(bars),
            "source": "OpenStreetMap - 10x10 Degree Blocks (Combined)",
            "license": "ODbL (OpenStreetMap)"
        },
        "bars": bars
    }
    
    with open('data/bars_data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    file_size = len(json.dumps(output)) / 1024 / 1024
    print(f"✅ Saved data/bars_data.json ({file_size:.1f} MB)")
    print(f"🎉 Successfully combined {len(bars)} bars worldwide!")
    
    return len(bars)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--combine":
        # Combine existing region files
        count = combine_region_files()
    else:
        # Download bars by regions
        count = download_all_bars()
    
    print(f"\n{'='*50}")
    if count > 0:
        print(f"✅ SUCCESS: Downloaded {count} bars worldwide")
        print("Your Beer Compass app should now find much closer bars!")
        print("\n💡 If the download was interrupted, you can resume by running:")
        print("   python3 download_bars.py")
        print("\n💡 To combine existing region files, run:")
        print("   python3 download_bars.py --combine")
    else:
        print("❌ FAILED: Could not download bars")
        print("The global query might be too large. Try again later.")
    print(f"{'='*50}")
