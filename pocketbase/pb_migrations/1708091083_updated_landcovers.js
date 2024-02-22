/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7j6bjnt1r56ut84")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xziu7fwz",
    "name": "original",
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
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7j6bjnt1r56ut84")

  // remove
  collection.schema.removeField("xziu7fwz")

  return dao.saveCollection(collection)
})
