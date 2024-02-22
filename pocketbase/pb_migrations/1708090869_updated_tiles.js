/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ewi0x38j6dujau8")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "chrmep3o",
    "name": "landcover",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "7j6bjnt1r56ut84",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ewi0x38j6dujau8")

  // remove
  collection.schema.removeField("chrmep3o")

  return dao.saveCollection(collection)
})
