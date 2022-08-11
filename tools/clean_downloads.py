import os

curr_path = os.path.dirname(os.path.realpath(__file__))

dir_path = os.path.join(curr_path, '../', 'public', 'downloads')
dir = os.listdir(dir_path)

for file in dir:
    if file.endswith('.zip'):
        os.remove(os.path.join(dir_path, file))