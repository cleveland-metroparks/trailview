NOTE: It is best to use a Markdown editor/viewer for this file, I like MarkText



* This is an explanation as to the layout of the tables in the TrailView database.

---

### AdminAccounts

Contains the accounts used to log into the admin page at `/admin` on the website.

| Column   | Description                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ID       | Auto incrementing integer to be unique, don't worry about this                                                                                 |
| Username | Pretty self explanatory                                                                                                                        |
| Password | The `bcrypt` hash of the password. You can generate one here for a new password [https://bcrypt-generator.com/](https://bcrypt-generator.com/) |

---

### Reservations

Contains all reservations that trails use

| Column       | Description                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------- |
| Name         | Unique name for the reservation in `CamelCase`                                                      |
| FriendlyName | The display name of the reservation on the website, usually supports HTML formatting such at `<br>` |

---

### TrailInfo

Contains the data for any info bubbles added on the trail images from the admin page.

| Column      | Description                                                                               |
| ----------- | ----------------------------------------------------------------------------------------- |
| ID          | Auto-incrementing for uniqueness                                                          |
| ImageID     | The image ID the info is on                                                               |
| Pitch       | Where the info is located                                                                 |
| Yaw         | Where the info is located                                                                 |
| HoverText   | Text that is displayed when a mouse hovers over the info bubble. Supports HTML formatting |
| TargetPitch | Unused                                                                                    |
| TargetYaw   | Unused                                                                                    |
| TargetHFOV  | Unused                                                                                    |
| CSSClass    | Unused                                                                                    |

---

### Trails

Contains all the info for trails

| Column       | Description                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name         | Unique name for trail, uses `CamelCase`                                                                                                                                               |
| FriendlyName | Display name for the trail. Supports HTML formatting                                                                                                                                  |
| Reservation  | The reservation the trail is a part of. Should use a reservation specified in the `Name` column of the `Reservations` table                                                           |
| ImageURL     | Unused                                                                                                                                                                                |
| InitImageID  | Unused                                                                                                                                                                                |
| SequenceName | The name of the folder that the trail is located in at `E:\trails` on the web server. By default it is the same as the `Name` column                                                  |
| Visibility   | Unused                                                                                                                                                                                |
| Status       | The processing status of the trail. In order they are: `Upload`, `Blur`, `Sequence`, `Done` and are usually automatically updated by the `trailview_watchdog` service and admin site. |
| Flipped      | Whether or not the trail is flipped 180°                                                                                                                                              |
