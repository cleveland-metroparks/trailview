import json             # for processing json files
import argparse         # for processing console arguments
import os               # For directory manipulation
# for processing geo distance and bearing
from geographiclib.geodesic import Geodesic
import datetime         # for sorting by creation date
from cmath import rect, phase       # for angle calculations
from math import radians, degrees   # for angle calculations

'''
Author: Matthew Oros
Email: mjo1@clevelandmetroparks.com

This script creates a manifest.json which contains image metadata that
eventually gets combined into a master data.json file
'''

# Process console arguments
parser = argparse.ArgumentParser(description="Create manifest.json")
parser.add_argument('dir', type=str, help='The sequence directory')
parser.add_argument('--flip', action=argparse.BooleanOptionalAction,
                    help='The sequence will be flipped 180*')
args = parser.parse_args()

seq_dir = str(args.dir)
img_dir = os.path.join(seq_dir, 'img')
flipped = True  # args.flip

# Create json structure
sequence_json = {
    'sequence': [

    ]
}

# Returns mean of list of angles in degrees
def mean_angle(deg: list[float]) -> float:
    return degrees(phase(sum(rect(1, radians(d)) for d in deg)/len(deg))) % 360


# Create dictionary from img json files
def get_all_images(dir: str) -> list:
    # Format of images list
    # [{'id', 'date', 'latitude', 'longitude'}, ...]
    images = []
    # Iterate through directory
    for filename in os.listdir(dir):
        filepath = os.path.join(dir, filename)
        # Must be json file
        if not filepath.endswith('.json'):
            continue
        # Read json
        f = open(filepath)
        img_data = json.load(f)
        f.close()
        # Add data to images list
        image = {}
        image['id'] = filename.replace('.json', '')
        image['date'] = datetime.datetime.strptime(
            str(img_data['creationDate']), '%Y-%m-%d %H:%M:%S')
        image['latitude'] = img_data['latitude']
        image['longitude'] = img_data['longitude']
        if image['latitude'] != 0.0 and image['longitude'] != 0.0 and image['date'] != None:
            images.append(image)
    return images


# Verify directory
if not os.path.exists(os.path.join(seq_dir, 'img')):
    print('img Directory does not exist!')

# Get images info
print("Getting image info")
images = get_all_images(os.path.join(seq_dir, 'img'))

# Sort images by datetime taken
print("Sorting images")
images.sort(key=lambda x: x['date'])

img_bearing_dict = {}

# Set bearing of images
print("Setting bearing of images")
for i in range(len(images)):
    # If last image, set bearing to previous image
    if i == (len(images) - 1):
        images[i]['bearing'] = images[i - 1]['bearing']
        continue
    img1 = images[i]
    img2 = images[i + 1]
    info = Geodesic.WGS84.Inverse(
        img1['latitude'], img1['longitude'], img2['latitude'], img2['longitude'])
    # If distance is less than cutoff, then base bearing on next and previous image
    if (info['s12'] <= 10):
        # Get bearing based on next image
        brng = info['azi1']
        if brng < 0:
            brng += 360
        if flipped:
            brng = (brng + 180) % 360

        # If not the first image
        if i != 0:
            # Determine if and then use bearing based on previous image as well
            avg = mean_angle([brng, images[i - 1]['bearing']])
            diff = ((brng - avg) + 180) % 360 - 180
            if diff < float(45):
                images[i]['bearing'] = avg
            else:
                # Only base bearing on next image
                images[i]['bearing'] = brng
        else:
            # Only base bearing on next image
            images[i]['bearing'] = brng
    else:
        # If distance not less than cutoff, then bearing is based on previous image
        images[i]['bearing'] = images[i - 1]['bearing']

# Remove images without necessary metadata
print("Removing images without necessary metadata")
filtered_images = []
for img in images:
    if 'bearing' in img and 'latitude' in img and 'longitude' in img and 'date' in img:
        filtered_images.append(img)
    else:
        print("removed!")
images_brng = filtered_images

for img in images_brng:
    img_bearing_dict[img['id']] = img['bearing']

# get all images
img_data_list = []
sht_dict = {}

for f in os.listdir(img_dir):
    f_path = os.path.join(img_dir, f)
    if os.path.isfile(f_path) and f_path.endswith('.json'):
        j = open(f_path)
        img_data = json.load(j)
        j.close()
        img_data['creationDate'] = datetime.datetime.strptime(
            str(img_data['creationDate']), '%Y-%m-%d %H:%M:%S')
        img_data['id'] = f.replace('.json', '')
        img_data_list.append(img_data)
    elif os.path.isdir(f_path):
        j = open(os.path.join(f_path, 'config.json'))
        config_data = json.load(j)
        j.close()
        sht_dict[f] = config_data['multiRes']['shtHash']


# Sort images by datetime taken
img_data_list.sort(key=lambda x: x['creationDate'])

# create geo_sequence.json
prev_data = None
for img_data in img_data_list:
    if not img_data['id'] in img_bearing_dict:
        continue
    sequence_json['sequence'].append({
        'id': img_data['id'],
        'sequence': os.path.basename(seq_dir),
        'latitude': img_data['latitude'],
        'longitude': img_data['longitude'],
        'bearing': img_bearing_dict[img_data['id']],
        'flipped': flipped,
        'creationDate': str(img_data['creationDate']),
        'shtHash': sht_dict[img_data['id']]
    })

# Write json file
with open(os.path.join(seq_dir, "manifest.json"), "w") as outfile:
    json.dump(sequence_json, outfile)
