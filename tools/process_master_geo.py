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
parser = argparse.ArgumentParser(description="Create geo_master.json")
parser.add_argument('dir', type=str, help='Directory that contains all the sequences.')
args = parser.parse_args()

directory = str(args.dir)

# Create json structure
geo_json = {
    'geo_data': [

    ]
}


geo_data_dict = {}

for f in os.listdir(directory):
    f_path = os.path.join(directory, f)
    if os.path.isdir(f_path):
        if os.path.exists(os.path.join(f_path, 'geo_sequence.json')):
            j = open(os.path.join(f_path, 'geo_sequence.json'))
            geo_data = json.load(j)
            j.close()
            geo_data_dict[f] = geo_data


for trail in geo_data_dict:
    for point in geo_data_dict[trail]['geo_sequence']:
        if float(point["latitude"]) == 0 or float(point["longitude"] == 0):
            continue
        if "bearing" not in point:
            continue
        geo_json['geo_data'].append({
            "sequence": trail,
            "id": point["id"],
            "latitude": point["latitude"],
            "longitude": point["longitude"],
            "bearing": point["bearing"],
        })

def round_floats(o):
    if isinstance(o, float):
        return round(o, 6)
    if isinstance(o, dict):
        return {k: round_floats(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [round_floats(x) for x in o]
    return o

with open(os.path.join(directory, "geo_master.json"), "w") as outfile:
    json.dump(round_floats(geo_json), outfile)
    

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