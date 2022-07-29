import subprocess   # For calling tile generation script
import os           # For directory manipulation
import argparse     # For console arguments

'''
Author: Matthew Oros
Date: 6/15/22
Email: mjo1@clevelandmetroparks.com
'''

# Process console arguments
parser = argparse.ArgumentParser(description="Create sequence.json for all trails in directory")
parser.add_argument('dir', type=str, help='Directory that contains all trail folders.')
parser.add_argument('base', type=str, help='Path relative to the webserver, needs trailing slash!')
args = parser.parse_args()

directory = str(args.dir)
base = str(args.base)

# Iterate through directory
for seq_name in os.listdir(directory):
    seq_path = os.path.join(directory, seq_name)
    if os.path.isdir(seq_path):
        print("\nProcessing Sequence: " + seq_name)
        subprocess.call("python process_sequence.py " + seq_path + " " + base + seq_name)
