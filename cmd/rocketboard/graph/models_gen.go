// Code generated by github.com/99designs/gqlgen, DO NOT EDIT.

package graph

import (
	model "github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

type Column struct {
	Name  *string       `json:"name"`
	Cards []*model.Card `json:"cards"`
}
