import json             # for processing json files
import argparse         # for processing console arguments
import os               # For directory manipulation
from geographiclib.geodesic import Geodesic # for processing geo distance and bearing
import datetime         # for sorting by creation date

'''
Author: Matthew Oros
Date: 6/15/22
Email: mjo1@clevelandmetroparks.com
'''

# Process console arguments
parser = argparse.ArgumentParser(description="Create geo_sequence.json")
parser.add_argument('dir', type=str, help='Directory that contains the img folder.')
args = parser.parse_args()

directory = str(args.dir)
img_dir = os.path.join(directory, 'img')

# Create json structure
geo_json = {
    'geo_sequence': [

    ]
}

j = open(os.path.join(directory, 'bearing_sequence.json'))
bearing_data = json.load(j)
j.close()

# get all images
img_data_list = []

for f in os.listdir(img_dir):
    f_path = os.path.join(img_dir, f)
    if os.path.isfile(f_path) and f_path.endswith('.json'):
        j = open(f_path)
        img_data = json.load(j)
        j.close()
        img_data['creationDate'] = datetime.datetime.strptime(str(img_data['creationDate']), '%Y-%m-%d %H:%M:%S')
        img_data['id'] = f.replace('.json', '')
        img_data_list.append(img_data)

# Sort images by datetime taken
img_data_list.sort(key=lambda x: x['creationDate'])

# create geo_sequence.json
prev_data = None
for img_data in img_data_list:
    # if prev_data != None:
    #     info = Geodesic.WGS84.Inverse(img_data['latitude'], img_data['longitude'], prev_data['latitude'], prev_data['longitude'])
    #     if info['s12'] >= 10:
    geo_json['geo_sequence'].append({
        'id': img_data['id'],
        'latitude': img_data['latitude'],
        'longitude': img_data['longitude'],
        'bearing': bearing_data['bearing_sequence'][img_data['id']]
    })
    # prev_data = img_data
    # else:
    #     geo_json['geo_sequence'].append({
    #         'id': img_data['id'],
    #         'latitude': img_data['latitude'],
    #         'longitude': img_data['longitude']
    #     })
    #     prev_data = img_data
        
# Write json file
with open(os.path.join(directory, "geo_sequence.json"), "w") as outfile:
    json.dump(geo_json, outfile)