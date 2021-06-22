

# ZoottelKeeper: A Zookeeper for your Zettelkasten folder

## What? 

The main idea of Zettelkasten is the links that connect your notes. However, if you would like to organize your notes to folders, you have to set up and maintain an index Markdown file for each folder that contains all of the notes of the folder as links (wikilinks, internal md links etc.).
Which means that if you move a file to an other folder, your have to remove its link from the index file of the source folder, and add a link to the index file of the target folder. 

If you are struggling with the same problems (like me), ZoottelKeeper is your program. It watches your folder, catches the changes and updates your index files within every folder and subfolders automatically.

## How does it work?
ZoottelKeeper watches the followings:

- _Creation_ of files in rootFolder and any subfolders within 
- _Deletion_ of files in rootFolder and any subfolders within 
- _Move_ a file among rootFolder to subFolders
- _Move_ a file among subfolders

After recognizing that one of these actions happened, it creates an index file within the affected (sub)folder if it still does not exist.

Its name is going to be **_Index_of_\<folder>.md** by default, its prefix (_Index_of_) is customizable in the config of the plugin.

Then it writes the list of the files within that folder as wikistyled links. 

WARNING! PLEASE NOTE THAT THIS PLUGIN IS CURRENTLY IN BETA, SO PLEASE TRY IT FIRST WITH A TEST VAULT AND/OR BACKUP YOUR DATA TO PREVENT DATA LOSS. 

## Example

Assume that we have a Zettelkasten folder with 2 subfolders `FolderA` and `FolderB`.

1. If I create a note called `fileA.md` in `FolderA` then ZoottelKeeper creates an index file within `FolderA` called **_Index_of_FolderA.md** with content: 
    - **[[fileA]]**
    - **[[_Index_of_FolderA.md]]**

2. If the file is being moved from `FolderA` to `FolderB`, **_Index_of_FolderB.md** is going to be created in `FolderB` with content

    - **[[fileA]]**
    - **[[_Index_of_FolderA.md]]**

   and the content the existing index file in `FolderA` is going to be updated by removing the link of `fileA`:

    - **[[_Index_of_FolderA.md]]**

3. If fileA is being deleted from `FolderB` then its link is going to be removed from **_Index_of_FolderB.md**


## Install and usage

Similarly to any other plugins it is downloadable within Obsidian. Then, after enabling it, you will be able to configure Zoottelkeeper in its config interface. The following options can be configured:

- **The prefix of the index files**. Please note that it must be unique, othervise, normal notes with the same note name (with the parent folder name at its end, check the example)will be recognized as index files, and in this cases they will be updated! 

- **Style of the index items**. Index items can be generated as
  - pure Obsidian links, 
  - list items (dots)
  - links with checkboxes



## Tip for Graph view

As the folder links don't point to real notes (because they are folders), to make them visible in the Graph view, please enable the option of viewing orphan notes.


