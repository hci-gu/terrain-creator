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

		// remove
		collection.Schema.RemoveField("avr9foec")

		// remove
		collection.Schema.RemoveField("3bwmxqce")

		// add
		new_index := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "jrew4lvq",
			"name": "index",
			"type": "number",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"min": null,
				"max": null,
				"noDecimal": false
			}
		}`), new_index)
		collection.Schema.AddField(new_index)

		// add
		new_data := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "6ue9fbtk",
			"name": "data",
			"type": "json",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"maxSize": 2000000
			}
		}`), new_data)
		collection.Schema.AddField(new_data)

		return dao.SaveCollection(collection)
	}, func(db dbx.Builder) error {
		dao := daos.New(db);

		collection, err := dao.FindCollectionByNameOrId("n6qz3c3tvyjlzmb")
		if err != nil {
			return err
		}

		// add
		del_field := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "avr9foec",
			"name": "field",
			"type": "text",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"min": null,
				"max": null,
				"pattern": ""
			}
		}`), del_field)
		collection.Schema.AddField(del_field)

		// add
		del_value := &schema.SchemaField{}
		json.Unmarshal([]byte(`{
			"system": false,
			"id": "3bwmxqce",
			"name": "value",
			"type": "number",
			"required": false,
			"presentable": false,
			"unique": false,
			"options": {
				"min": null,
				"max": null,
				"noDecimal": false
			}
		}`), del_value)
		collection.Schema.AddField(del_value)

		// remove
		collection.Schema.RemoveField("jrew4lvq")

		// remove
		collection.Schema.RemoveField("6ue9fbtk")

		return dao.SaveCollection(collection)
	})
}
