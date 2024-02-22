/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "qh5a6aeji7vbauu",
    "created": "2024-02-16 13:34:30.054Z",
    "updated": "2024-02-16 13:34:30.054Z",
    "name": "heightmaps",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "1xdx58my",
        "name": "heightmap",
        "type": "file",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "mimeTypes": [],
          "thumbs": [],
          "maxSelect": 1,
          "maxSize": 5242880,
          "protected": false
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("qh5a6aeji7vbauu");

  return dao.deleteCollection(collection);
})
