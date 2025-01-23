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

		collection, err := dao.FindCollectionByNameOrId("0hdk5ehquq5qjpg")
		if err != nil {
			return err
		}

		// remove
		collection.Schema.RemoveField("ifbvnezf")

		// add
		new_options := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "wqbwx8nd",
			"name": "options",
			"type": "json",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"maxSize": 2000000
			}
		}`), new_options)
		collection.Schema.AddField(new_options)

		return dao.SaveCollection(collection)
	}, func(db dbx.Builder) error {
		dao := daos.New(db);

		collection, err := dao.FindCollectionByNameOrId("0hdk5ehquq5qjpg")
		if err != nil {
			return err
		}

		// add
		del_timesteps := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "ifbvnezf",
			"name": "timesteps",
			"type": "relation",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"collectionId": "n6qz3c3tvyjlzmb",
				"cascadeDelete": true,
				"minSelect": null,
				"maxSelect": null,
				"displayFields": null
			}
		}`), del_timesteps)
		collection.Schema.AddField(del_timesteps)

		// remove
		collection.Schema.RemoveField("wqbwx8nd")

		return dao.SaveCollection(collection)
	})
}
