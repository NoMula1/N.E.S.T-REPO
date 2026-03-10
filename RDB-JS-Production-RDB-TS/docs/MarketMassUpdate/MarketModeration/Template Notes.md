Template notes will be a way for marketplace moderators to store quick information about members in their posts. Often referred to as "User Market Notes".

Invocation: https://discord.com/channels/489424959270158356/1193040410847756288/1208483134006370385

# Limits and Restraints
*"Limits and Restraints" relative to data schemas; restraints may change based on database demand*
- - -
- UMN descriptions will be limited to `4000` characters or less
- UMNs cannot have more than `3` attached templates at a time
- UMNs cannot contain more than `8` tags
# Usage
The only people who will be using UMNs are Marketplace Staff. These notes will not be available to regular members.

## Via Templates
The number of UMNs that a template owner is attached to will be appended to the top of a post template approval if it is `>= 1`. A `Button` will be appended to the action row, named `View Notes`. Even if a user has no UMNs, this will be the interface in which a Marketplace Staff Member will create notes.

After the button is clicked, a new interface will be replied with, containing an embed of summaries of all notes. The maximum count for UMN documents is set to *10*, so this should never overflow Discord limits of 4096/embed, however, the total embed description will be cut off at 4096. For every note entry, the...
- Internal Document Id, and
- 50 characters or less of the note description, and
- tags
will be displayed in the following format:

`65dabd9d529e1cc06c168157` | tags: `do-not-alter, scam-likely`
> Lorem ispum...

In the above interface, a `Button` and `StringSelectMenu` will be appended. The `Button` will be used for adding a new note, and the `StringSelectMenu` will be filled with all of the user's notes. See the below image for an example on the formatting of the select menu.

![](https://cdn.discordapp.com/attachments/1210369229677797449/1216036321533890590/gdumxF5.png?ex=65feed13&is=65ec7813&hm=d639921e308ec1949111c851ae17cf79834d238e951313a33e1a79cb1c1c803f&)

When the `Create Note` button is pressed, a new interface will be opened, with a CRUD embed. See below for the embed and button setup.
```embed
<title>           # New note for user lanjt
<desc-char=4000>  Lorem ispum...

<desc-char=?>     **0** post template snapshots are attached
- - - OR - - -
<desc-char=?>     **2** post template snapshots are attached
<desc-char=?>     **Snapshot 1** `FOR-HIRE`
<desc-char=?>     **Snapshot 2** `SELLING`

<footer>          Tags: do-not-accept, scam-likely
```
\[**Cancel**\] \[**Save**\]
\[**Attach Template Snapshot**\]
