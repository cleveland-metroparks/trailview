# TrailView API

---

#### `/api/delete-trail.php`

Deletes all images from a specified sequence.

> Accepts `POST` request with
>
> ```typescript
> {
>     "pass": string?, // API Key, needed if not logged in
>     "name": string, // sequence name to delete images from
> }
> ```

---

#### `/api/download-images.php`

Zips and downloads all original uploaded images in a specified sequence. Then returns a link to the zipped file on the web-server once the request is complete.

NOTE: The zipped file on the web-server is deleted daily so the link is only valid until somewhere around midnight when the clean-up is scheduled.

>Accepts `GET` request with
>
>```typescript
>{
>    "pass": string?, // API Key, needed if not logged in
>    "name": string, // sequence name to download images from
>}
>```

---

#### `/api/image.php`

Either gets images or posts new images. `"standard"` `GET` request type retrieves only necessary information for `TrailView.js` to function and should be preferred. `"all"` `GET` request type retrieves all information about all images. This is really only used in the `/admin` page for TrailView.

> Accepts `GET` request with
>
> ```typescript
> {
>     "type": string, // Type of request to make, either "standard" or "all" are valid
>     "id": string?, // Optional image id to only retrieve info from a specific image.
>     			   // If left blank, then all images are retrieved
> }
> ```

> Accepts `POST` request with
>
> ```typescript
> {
>     "pass": string, // API Key
>     "id": string, // Image ID
>     "sequenceName": string, // Sequence the image is a part of
>     "originalLatitude": float,
>     "originalLongitude": float,
>     "latitude": float,
>     "longitude": float,
>     "bearing": float,
>     "flipped": int, // 0 for false, 1 for true
>     "shtHash": string, // Sphere-Harmonic-Transform for image previews
>     "originalName": string,	// Original image filename
> }
> ```

---

#### `/api/mark-delete-trail.php`

Marks or retrieves trails for deletion.

>Accepts `GET` request with
>
>```typescript
>{
>    "name": string, // Sequence name to get deletion status from
>}
>```

> Accepts `POST` request with
>
> ```typescript
> {
>     "pass": string?, // API Key, needed if not logged in
>     "name": string, // Sequence name to set deletion status to
> }
> ```

---

#### `/api/preview.php`

Retrieves Sphere-Harmonic-Transform Hash image preview for the specified image ID.

> Accepts `GET` request with
>
> ```typescript
> {
> 	"id": string, // Image ID to request preview from
> }
> ```

---

#### `/api/status.php`

Retrieves or sets processing status of sequences.

Valid statuses are

```typescript
"Upload",
"Blur",
"Tile",
"Sequence",
"Done",
```

> Accepts `GET ` request

> Accepts `POST` request with
>
> ```typescript
> {
>     "pass": string?, // API Key, needed if not logged in
>     "name": string, // Sequence name to set the status of
>     "status": string, // Status string to set
> }
> ```

---

#### `/api/trails.php`

Adds or retrieves sequences.

> Accepts `GET` request

> Accepts `POST` request with
>
> ```typescript
> {
>     "pass": string?, // API Key, needed if not logged in
>     "name": string, // Sequence name to add
> }
> ```

---

#### `/api/update-images.php`

Updates image data. Can either specify an entire sequence to modify, or a single image. There are some attributes that can only be done with a specific image only.

Valid keys for single images

```typescript
"sequenceName": string,
"latitude": float,
"longitude": float,
"bearing": float,
"flipped": int, // 0 for false, 1 for true
"pitchCorection": float,
"visibility": int, // 0 for false, 1 for true
```

Valid keys for an entire sequence

```typescript
"sequenceName": string,
"flipped": int, // 0 for false, 1 for true
"pitchCorrection": float,
"visibility": int, // 0 for false, 1 for true
```

> Accepts `POST` request with
>
> ```typescript
> {
>     "pass": string?, // API Key, needed if not logged in
>     "id": string?, // Image ID if only updating a single image
>     "sequenceName": string?, // Sequence name needed if updating an entire sequence
>     "key": string, // See valid keys above
>     "value": any, // See type for specified key above
> }
> ```

