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

		collection, err := dao.FindCollectionByNameOrId("ewi0x38j6dujau8")
		if err != nil {
			return err
		}

		// add
		new_oceanData := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "0lf3xjtm",
			"name": "oceanData",
			"type": "relation",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"collectionId": "e8mjtte6qsg23nj",
				"cascadeDelete": false,
				"minSelect": null,
				"maxSelect": 1,
				"displayFields": null
			}
		}`), new_oceanData)
		collection.Schema.AddField(new_oceanData)

		return dao.SaveCollection(collection)
	}, func(db dbx.Builder) error {
		dao := daos.New(db);

		collection, err := dao.FindCollectionByNameOrId("ewi0x38j6dujau8")
		if err != nil {
			return err
		}

		// remove
		collection.Schema.RemoveField("0lf3xjtm")

		return dao.SaveCollection(collection)
	})
}
