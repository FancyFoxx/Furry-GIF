# Furry GIF

Telegram bot and accompanying web interface for saving, tagging, and managing furry-related GIFs.

## Version

Current release: 0.1.0

## Running

### Configuration

*Note:* Create the file `.env` in the root directory of the application if it does not exist already.
```
PORT=<port_number>

DB_USER=<string>
DB_HOST=<string>
DB_PASSWORD=<string>
DB_DATABASE=<string>

BOT_TOKEN=<string>
```
- `PORT` Port number from which the web application can be accessed.
- `DB_USER` Username of the MySQL Database account.
- `DB_HOST` Hostname from which the MySQL account will access the database.
- `DB_PASSWORD` Password for MySQL Database account
- `DB_DATABASE` Name of database which to connect for data storage.
- `BOT_TOKEN` Telegram bot authentication token.

## License

[MIT](LICENSE)
