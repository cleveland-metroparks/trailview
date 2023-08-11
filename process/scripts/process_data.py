import json             # for processing json files
import argparse         # for processing console arguments
import os               # For directory manipulation
import datetime         # for sorting by creation date

'''
Author: Matthew Oros
Email: mjo1@clevelandmetroparks.com

This script creates a master data.json file which contains
image metadata that gets uploaded to the database
'''

# Process console arguments
parser = argparse.ArgumentParser(
    description="Create data.json and img_hash.json")
parser.add_argument(
    'dir', type=str, help='Directory that contains all the sequences.')
args = parser.parse_args()

directory = str(args.dir)

# Create json structure
data_json = {
    'data': [

    ]
}

hash_json = {
    'img_hash': {

    }
}


seq_dict = {}

for f in os.listdir(directory):
    f_path = os.path.join(directory, f)
    if os.path.isdir(f_path):
        if os.path.exists(os.path.join(f_path, 'sequence_new.json')):
            j = open(os.path.join(f_path, 'sequence_new.json'))
            seq_data = json.load(j)
            j.close()
            seq_dict[f] = seq_data


for trail in seq_dict:
    for point in seq_dict[trail]['sequence']:
        if float(point["latitude"]) == 0 or float(point["longitude"] == 0):
            continue
        if "bearing" not in point:
            continue
        data_json['data'].append({
            'id': point['id'],
            "sequence": trail,
            "latitude": point["latitude"],
            "longitude": point["longitude"],
            "bearing": point["bearing"],
            'flipped': point['flipped'],
            'creationDate': point['creationDate'],
            'shtHash': point['shtHash']
        })
        hash_json['img_hash'][point['id']] = point['shtHash']

with open(os.path.join(directory, "data.json"), "w") as outfile:
    json.dump(data_json, outfile)

with open(os.path.join(directory, "img_hash.json"), "w") as outfile:
    json.dump(hash_json, outfile)
