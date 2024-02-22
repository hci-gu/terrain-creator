package main

import (
	utils "app/lib"
	"image/color"
	"log"
	"math"
	"strings"

	"github.com/pocketbase/pocketbase"

	"github.com/disintegration/imaging"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/tools/cron"
)

func onLandcoverUpdate(record *models.Record, collection *models.Collection, app *pocketbase.PocketBase) error {
	if record.GetString("color") == "" {
		onLandcoverCreate(record, collection, app)
		return nil
	}

	src, newFilePath := utils.GetImageForField(record, collection, app.DataDir(), "color", "color_100")

	resized := imaging.Resize(src, 100, 100, imaging.Lanczos)
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
	imaging.Save(newImage, newFilePath)
	record.Set("color_100", strings.Split(newFilePath, "/")[len(strings.Split(newFilePath, "/"))-1])

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

func main() {
	app := pocketbase.New()

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
		src, newFilePath := utils.GetImageForField(e.Record, e.Collection, app.DataDir(), "original", "heightmap")

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
		e.Record.Set("heightmap", strings.Split(newFilePath, "/")[len(strings.Split(newFilePath, "/"))-1])
		e.Record.Set("minHeight", minHeight)
		e.Record.Set("maxHeight", maxHeight)
		app.Dao().SaveRecord(e.Record)

		return nil
	})

	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		scheduler := cron.New()

		// prints "Hello!" every 2 minutes
		scheduler.MustAdd("hello", "* * * * *", func() {
			log.Println("Hello!")
		})

		scheduler.Start()

		return nil
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
