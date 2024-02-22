/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7j6bjnt1r56ut84")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "w7hmp5ei",
    "name": "coverage",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 2000000
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7j6bjnt1r56ut84")

  // remove
  collection.schema.removeField("w7hmp5ei")

  return dao.saveCollection(collection)
})
