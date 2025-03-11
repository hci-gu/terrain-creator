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

		collection, err := dao.FindCollectionByNameOrId("e8mjtte6qsg23nj")
		if err != nil {
			return err
		}

		// add
		new_depth := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "5ols6ncn",
			"name": "depth",
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
		}`), new_depth)
		collection.Schema.AddField(new_depth)

		return dao.SaveCollection(collection)
	}, func(db dbx.Builder) error {
		dao := daos.New(db);

		collection, err := dao.FindCollectionByNameOrId("e8mjtte6qsg23nj")
		if err != nil {
			return err
		}

		// remove
		collection.Schema.RemoveField("5ols6ncn")

		return dao.SaveCollection(collection)
	})
}
