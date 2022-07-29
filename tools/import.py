import argparse     # For parsing console arguments
import os           # For directory traversal
import shutil       # For file copying
import subprocess   # For calling other scripts

# Process console arguments
parser = argparse.ArgumentParser(description="Import a trail from the network drive.")
parser.add_argument('name', type=str, help='Name of the trail (CamelCase)')
args = parser.parse_args()

img_original_dir = os.path.join("E:\\trails", args.name, 'img_original')

curr_path = os.path.dirname(os.path.realpath(__file__))

subprocess.call('python ' + os.path.join(curr_path, 'process_imgs.py ' + os.path.join('E:\\trails', args.name)))