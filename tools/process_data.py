import json             # for processing json files
import argparse         # for processing console arguments
import os               # For directory manipulation
import datetime         # for sorting by creation date

'''
Author: Matthew Oros
Date: 6/27/22
Email: mjo1@clevelandmetroparks.com
'''

# Process console arguments
parser = argparse.ArgumentParser(description="Create data.json and img_hash.json")
parser.add_argument('dir', type=str, help='Directory that contains all the sequences.')
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
            'shtHash': point['shtHash']
        })
        hash_json['img_hash'][point['id']] = point['shtHash']

def round_floats(o):
    if isinstance(o, float):
        return round(o, 7)
    if isinstance(o, dict):
        return {k: round_floats(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [round_floats(x) for x in o]
    return o

with open(os.path.join(directory, "data.json"), "w") as outfile:
    json.dump(round_floats(data_json), outfile)

with open(os.path.join(directory, "img_hash.json"), "w") as outfile:
    json.dump(hash_json, outfile)
    

# # create geo_sequence.json
# prev_data = None
# for img_data in img_data_list:
#     # if prev_data != None:
#     #     info = Geodesic.WGS84.Inverse(img_data['latitude'], img_data['longitude'], prev_data['latitude'], prev_data['longitude'])
#     #     if info['s12'] >= 10:
#     geo_json['geo_sequence'].append({
#         'id': img_data['id'],
#         'latitude': img_data['latitude'],
#         'longitude': img_data['longitude']
#     })
#     # prev_data = img_data
#     # else:
#     #     geo_json['geo_sequence'].append({
#     #         'id': img_data['id'],
#     #         'latitude': img_data['latitude'],
#     #         'longitude': img_data['longitude']
#     #     })
#     #     prev_data = img_data
        
# # Write json file
# with open(os.path.join(directory, "geo_sequence.json"), "w") as outfile:
#     json.dump(geo_json, outfile, indent=4)