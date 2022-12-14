import argparse
import os
import json
import requests

'''
Author: Matthew Oros
Email: mjo1@clevelandmetroparks.com

This script adds info from data.json to the database
'''

curr_path = os.path.dirname(os.path.realpath(__file__))

j = open(os.path.join(curr_path, '../', 'config', 'local.json'))
api_key = json.load(j)['api_password']
j.close()

parser = argparse.ArgumentParser(description="Add image data to db")
parser.add_argument('dir', type=str, help='Trails dir')
args = parser.parse_args()

trails_dir = args.dir

f = open(os.path.join(trails_dir, 'data.json'))
data_json = json.load(f)
f.close()

data = data_json['data']

db_data = requests.get(url = 'https://trailview.cmparks.net/api/images.php?type=all').json()
db_data = db_data['imagesAll']

count = 1

db_imgs = []

for db_img in db_data:
    db_imgs.append(db_img['id'])

for img in data:
    if not img['id'] in db_imgs:
        print('\nProgress: (' + str(count) + '/' + str(len(data)) + ')')
        print('Sending Id: ' + img['id'])
        res = requests.post(
            url = 'https://trailview.cmparks.net/api/images.php', 
            data = {
                'pass': api_key,
                'id': img['id'],
                'sequenceName': img['sequence'],
                'originalLatitude': img['latitude'],
                'originalLongitude': img['longitude'],
                'latitude': img['latitude'],
                'longitude': img['longitude'],
                'bearing': img['bearing'],
                'flipped':  0 if img['flipped'] == False else 1,
                'shtHash': img['shtHash'],
                'originalName': None,
            }
        )
        print('Response code: ' + str(res.status_code))
        print('Response body: ' + str(res.content))
    count += 1