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

### TrailInfo - NOT USED CURRENTLY

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

| Column   | Description                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | Unique name for trail, uses `CamelCase`. Same name as folder found in `E:\trails` on the web-server                                                                                   |
| Status   | The processing status of the trail. In order they are: `Upload`, `Blur`, `Sequence`, `Done` and are usually automatically updated by the `trailview_watchdog` service and admin site. |
| ToDelete | This marks whether the trail should be deleted. If `0` then it is normal. If `1` then the `trailview_watchdog` service will delete the trail when all other scripts finish.           |
