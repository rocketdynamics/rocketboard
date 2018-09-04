package utils

import (
	"github.com/oklog/ulid"
	"math/rand"
	"time"
)

var entropy *rand.Rand

func init() {
	entropy = rand.New(rand.NewSource(time.Now().UnixNano()))
}

func NewUlid() string {
	return ulid.MustNew(ulid.Now(), entropy).String()
}
