#!/usr/bin/env python3

def parse_csv_line(line):
    """Parse a single CSV line handling quoted fields"""
    fields = []
    current = ''
    in_quotes = False
    
    i = 0
    while i < len(line):
        char = line[i]
        
        if char == '"':
            if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                # Escaped quote - add one quote to current field
                current += '"'
                i += 1  # Skip next quote
            else:
                # Toggle quote state
                in_quotes = not in_quotes
        elif char == ',' and not in_quotes:
            fields.append(current)
            current = ''
        else:
            current += char
        
        i += 1
    
    fields.append(current)
    return fields

# Test cases
test_cases = [
    'name,lat,lon',
    'Cocktails on the Rocks,-13.8327489,-171.764852',
    '"Gasthaus ""Laternchen""",51.0020672,6.8521633',
    '"CentralBar, Shisha-Bar",50.5863134,8.6731598',
    '"""L""",50.9522133,6.9206586'
]

print('Testing CSV parser:')
for i, line in enumerate(test_cases):
    fields = parse_csv_line(line)
    print(f'Test {i + 1}: "{line}"')
    print(f'  Parsed: {fields}')
    print()
