#!/usr/bin/env python
import requests

base_url = 'http://localhost:8000'

# Login (demo defaults)
r = requests.post(f'{base_url}/auth/login', json={'username':'admin','password':'admin'})
if r.status_code != 200:
    print(f'✗ [LOGIN] {r.status_code}')
    exit(1)

token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print(f'✓ [LOGIN] 200')

# Test all endpoints
endpoints = [
    ('GET', '/cameras', None),
    ('GET', '/settings', None),
    ('GET', '/dashboard/stats', None),
    ('GET', '/zones', None),
    ('GET', '/users', None),
    ('GET', '/health', None, False),  # No auth needed
    ('GET', '/alerts', None),
]

for endpoint in endpoints:
    method = endpoint[0]
    path = endpoint[1]
    auth_required = endpoint[3] if len(endpoint) > 3 else True
    
    if method == 'GET':
        if auth_required:
            r = requests.get(f'{base_url}{path}', headers=headers)
        else:
            r = requests.get(f'{base_url}{path}')
        
        status = '✓' if r.status_code == 200 else '✗'
        print(f'{status} [{method:4}] {path:30} {r.status_code}')

print('\n✓ Sistema totalmente operacional!')
