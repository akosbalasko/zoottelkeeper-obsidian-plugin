# Obsidian Clean Index Plugin
### Based on Zoottelkeeper 0.6.0

---

For the full documentation please check the main [repo](https://github.com/akosbalasko/zoottelkeeper-obsidian-plugin).

---

## 1. Changes

1. Added new indexing-variant "No File Path", which removes path and .md ending from names of indexed files.
2. The folder and the index-file itself are no longer listed in the index-list.
3. The index-list is now sorted alphabetically.

Changes 2 and 3 are **implemented for all variants**, not just for "No File Path".

---

## 2. Important points raised by akosbalasko

> **The prefix of the index files**. Please note that it must be unique, othervise, normal notes with the same note name (with the parent folder name at its end, check the example) will be recognized as index files, and in this cases they will be updated!


As I'm using the plugin together with the folder-note plugin, so **I actually want my index-files to be the same name as the folder** because then the index-file is hidden and can be "reached" by clicking directly on the folder. But if your setup is different, please take this into consideration as it might have an impact.


> **Tipps for the Graph View:** As the folder links don't point to real notes (because they are folders), to make them visible in the Graph view, please enable the option of viewing orphan notes.


In my use-case this was not an issue. I actually wanted to remove these "lost" folders from the Graph view since they had no business being there but this might, once again, be different in your use-case. So please take care.

---

**As with the main plugin there is risk of data-loss and I don't give any guarantees or take any responsibility.**
