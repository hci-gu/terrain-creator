package migrations

import (
	"encoding/json"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/daos"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/models/schema"
)

func init() {
	m.Register(func(db dbx.Builder) error {
		dao := daos.New(db);

		collection, err := dao.FindCollectionByNameOrId("n6qz3c3tvyjlzmb")
		if err != nil {
			return err
		}

		// add
		new_simulation := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "gymw51lz",
			"name": "simulation",
			"type": "relation",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"collectionId": "0hdk5ehquq5qjpg",
				"cascadeDelete": true,
				"minSelect": null,
				"maxSelect": 1,
				"displayFields": null
			}
		}`), new_simulation)
		collection.Schema.AddField(new_simulation)

		return dao.SaveCollection(collection)
	}, func(db dbx.Builder) error {
		dao := daos.New(db);

		collection, err := dao.FindCollectionByNameOrId("n6qz3c3tvyjlzmb")
		if err != nil {
			return err
		}

		// remove
		collection.Schema.RemoveField("gymw51lz")

		return dao.SaveCollection(collection)
	})
}
