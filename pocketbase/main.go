package main

import (
	"app/lib/mapbox"
	utils "app/lib/utils"
	"image/color"
	"log"
	"math"
	"os"
	"strings"

	_ "app/migrations"

	"github.com/pocketbase/pocketbase"

	"github.com/disintegration/imaging"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func onLandcoverUpdate(record *models.Record, collection *models.Collection, app *pocketbase.PocketBase) error {
	if record.GetString("color") == "" {
		onLandcoverCreate(record, collection, app)
		return nil
	}

	src, newFilePath := utils.GetImageForField(record, collection, app.DataDir(), "color", "color_100")

	resized := imaging.Resize(src, 100, 100, imaging.NearestNeighbor)
	newImage := imaging.New(resized.Bounds().Dx(), resized.Bounds().Dy(), color.NRGBA{})

	// Loop over each pixel of the image.
	bounds := newImage.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			originalColor := resized.At(x, y)
			closest := utils.ClosestColor(originalColor, utils.Palette)

			newImage.Set(x, y, closest)
		}
	}
	// set custom encodeOptions
	// encodeOpts := {
	// 	JPEGQuality: 100,
	// }
	imaging.Save(newImage, newFilePath, imaging.PNGCompressionLevel(-1))

	record.Set("color_100", utils.GetFileNameForPath(newFilePath))

	// Calculate color percentages
	jsonMap, _ := utils.CalculateColorPercentages(newImage, utils.Palette)
	record.Set("coverage", jsonMap)

	return nil
}

func onLandcoverCreate(record *models.Record, collection *models.Collection, app *pocketbase.PocketBase) error {
	src, newFilePath := utils.GetImageForField(record, collection, app.DataDir(), "original", "color")

	newImage := imaging.New(src.Bounds().Dx(), src.Bounds().Dy(), color.NRGBA{})
	bounds := newImage.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			originalColor := src.At(x, y)
			closest := utils.ClosestColor(originalColor, utils.Palette)

			newImage.Set(x, y, closest)
		}
	}
	imaging.Save(newImage, newFilePath)
	record.Set("color", strings.Split(newFilePath, "/")[len(strings.Split(newFilePath, "/"))-1])

	onLandcoverUpdate(record, collection, app)

	return nil
}

func onHeightmapCreate(record *models.Record, collection *models.Collection, app *pocketbase.PocketBase) error {
	src, newFilePath := utils.GetImageForField(record, collection, app.DataDir(), "original", "heightmap")

	// init minheight and maxheight as infinity and -infinity
	minHeight := math.Inf(1)
	maxHeight := math.Inf(-1)

	newImage := imaging.New(src.Bounds().Dx(), src.Bounds().Dy(), color.NRGBA{})
	bounds := newImage.Bounds()
	// array of all heights
	heights := make([]float64, 0)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := src.At(x, y).RGBA()
			height := -10000 + float64(r*256*256+g*256+b)*0.1
			heights = append(heights, height)
			if height < minHeight {
				minHeight = height
			}
			if height > maxHeight {
				maxHeight = height
			}
		}
	}
	// normalize all heights
	for i, height := range heights {
		heights[i] = (height - minHeight) / (maxHeight - minHeight)
	}

	// set newImage to grayscale
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			height := heights[y*src.Bounds().Dx()+x]
			newImage.Set(x, y, color.NRGBA{
				R: uint8(height * 255),
				G: uint8(height * 255),
				B: uint8(height * 255),
				A: 255,
			})
		}
	}

	imaging.Save(newImage, newFilePath)
	record.Set("heightmap", strings.Split(newFilePath, "/")[len(strings.Split(newFilePath, "/"))-1])
	record.Set("minHeight", minHeight)
	record.Set("maxHeight", maxHeight)

	return nil
}

func main() {
	app := pocketbase.New()

	isGoRun := strings.HasPrefix(os.Args[0], os.TempDir())

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: isGoRun,
	})

	app.OnRecordAfterCreateRequest("tiles").Add(func(e *core.RecordCreateEvent) error {
		x := e.Record.GetInt("x")
		y := e.Record.GetInt("y")
		zoom := e.Record.GetInt("zoom")
		image := mapbox.DownloadSatelliteTile(x, y, zoom)

		filePath := utils.GetFilePathForField(e.Record, e.Collection, app.DataDir(), "satellite")
		imaging.Save(image, filePath)
		e.Record.Set("satellite", utils.GetFileNameForPath(filePath))

		bboxString := e.Record.GetString("bbox")
		metersPerPixel := mapbox.MeterPerPixelFromBboxAndZoom(zoom, bboxString)
		e.Record.Set("metersPerPixel", metersPerPixel)

		app.Dao().SaveRecord(e.Record)

		return nil
	})

	app.OnRecordAfterCreateRequest("tiles").Add(func(e *core.RecordCreateEvent) error {
		x := e.Record.GetInt("x")
		y := e.Record.GetInt("y")
		zoom := e.Record.GetInt("zoom")
		image := mapbox.DownloadHeightmapTile(x, y, zoom)

		collection, _ := app.Dao().FindCollectionByNameOrId("heightmaps")
		heightmap := models.NewRecord(collection)
		models.NewRecord(collection)

		app.Dao().SaveRecord(heightmap)

		filePath := utils.GetFilePathForField(heightmap, collection, app.DataDir(), "original")
		imaging.Save(image, filePath)
		heightmap.Set("original", utils.GetFileNameForPath(filePath))
		app.Dao().SaveRecord(heightmap)

		e.Record.Set("heightmap", heightmap.Id)
		app.Dao().SaveRecord(e.Record)

		onHeightmapCreate(heightmap, collection, app)

		app.Dao().SaveRecord(heightmap)

		return nil
	})

	app.OnRecordAfterCreateRequest("landcovers").Add(func(e *core.RecordCreateEvent) error {
		onLandcoverCreate(e.Record, e.Collection, app)

		app.Dao().SaveRecord(e.Record)

		return nil
	})

	app.OnRecordAfterUpdateRequest("landcovers").Add(func(e *core.RecordUpdateEvent) error {
		onLandcoverUpdate(e.Record, e.Collection, app)

		app.Dao().SaveRecord(e.Record)
		return nil
	})

	app.OnRecordAfterCreateRequest("heightmaps").Add(func(e *core.RecordCreateEvent) error {
		onHeightmapCreate(e.Record, e.Collection, app)

		app.Dao().SaveRecord(e.Record)
		return nil
	})

	// app.OnRecordBeforeDeleteRequest("simulations").Add(func(e *core.RecordDeleteEvent) error {
	// 	collection, _ := app.Dao().FindCollectionByNameOrId("timesteps")
	// 	timestepIds := e.Record.Get("timesteps")

	// 	for _, id := range timestepIds.([]string) {
	// 		timestep, _ := app.Dao().FindRecordById(collection.GetId(), id)
	// 		app.Dao().DeleteRecord(timestep)
	// 	}
	// 	return nil
	// })

	// app.OnRecordAfterCreateRequest("simulations").Add(func(e *core.RecordCreateEvent) error {
	// 	go func(e *core.RecordCreateEvent) { // Start of the goroutine
	// 		collection, _ := app.Dao().FindCollectionByNameOrId("timesteps")
	// 		// loop 10 times
	// 		wolfCount := 20
	// 		sheepCount := 40
	// 		for i := 0; i < 50; i++ {
	// 			timestepWolf := models.NewRecord(collection)
	// 			timestepWolf.Set("field", "wolves")
	// 			timestepSheep := models.NewRecord(collection)
	// 			timestepSheep.Set("field", "sheep")
	// 			// 50% chance of increasing or decreasing the wolf count
	// 			// if wolfCount is 0, only increas
	// 			if wolfCount == 0 {
	// 				wolfCount += 1
	// 			} else if rand.Intn(2) == 0 {
	// 				wolfCount += rand.Intn(3)
	// 				sheepCount -= rand.Intn(5)
	// 			} else {
	// 				wolfCount -= rand.Intn(3)
	// 				sheepCount += rand.Intn(5)
	// 			}

	// 			timestepWolf.Set("value", wolfCount)
	// 			timestepSheep.Set("value", sheepCount)
	// 			app.Dao().SaveRecord(timestepWolf)
	// 			app.Dao().SaveRecord(timestepSheep)

	// 			timesteps := e.Record.Get("timesteps").([]string)

	// 			e.Record.Set("timesteps", append(timesteps, timestepWolf.Id, timestepSheep.Id))
	// 			app.Dao().SaveRecord(e.Record)

	// 			time.Sleep(200 * time.Millisecond) // Wait for 1 second.
	// 			print("timestep created\n")
	// 		}
	// 	}(e)

	// 	return nil
	// })

	// app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
	// 	scheduler := cron.New()

	// 	// prints "Hello!" every 2 minutes
	// 	scheduler.MustAdd("hello", "* * * * *", func() {
	// 		log.Println("Hello!")
	// 	})

	// 	scheduler.Start()

	// 	return nil
	// })

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}

}
