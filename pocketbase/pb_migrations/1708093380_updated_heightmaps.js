/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("qh5a6aeji7vbauu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "n8jui1ul",
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
  const collection = dao.findCollectionByNameOrId("qh5a6aeji7vbauu")

  // remove
  collection.schema.removeField("n8jui1ul")

  return dao.saveCollection(collection)
})
