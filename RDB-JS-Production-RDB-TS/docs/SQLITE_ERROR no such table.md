Example if this error under logs:
```
0|core | 05-12-2023 02:22:22:790 | [31m[ERROR][39m | A client error occurred: SQLITE_ERROR: no such table: UrlWhitelists
```

This error often means that you forgot to update the database after updating the table list. Please follow the [[Updating The Database]] guide.