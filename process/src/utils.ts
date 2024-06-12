import fs from 'fs-extra';

export function parseDataJsonDate(dateTimeString: string): Date {
    const isoDateTimeString = dateTimeString.replace(' ', 'T') + '-04:00'; // Assuming New York timezone offset is UTC-4
    const parsedDate = new Date(isoDateTimeString);
    if (isNaN(parsedDate.getTime())) {
        throw new Error('Failed to parse date');
    }
    return parsedDate;
}

export async function jpgsInDir(dir: string) {
    const files = await fs.readdir(dir);
    const jpgs = files.filter((file) => {
        return (
            file.toLowerCase().endsWith('.jpg') ||
            file.toLowerCase().endsWith('.jpeg')
        );
    });
    return jpgs.length;
}

export async function jsonFilesInDir(dir: string) {
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter((file) => {
        return file.toLowerCase().endsWith('.json');
    });
    return jsonFiles.length;
}
