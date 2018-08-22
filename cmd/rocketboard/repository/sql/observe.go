package sql

import (
	"log"
	"time"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

func (db *sqlRepository) Observe(connectionid string, user string, retrospectiveId string) error {
	observation := model.Observation{
		User:            user,
		RetrospectiveId: retrospectiveId,
		ConnectionId:    connectionid,
		FirstSeen:       time.Now(),
		LastSeen:        time.Now(),
	}
	_, err := db.NamedExec(`INSERT INTO observations
      (user, retrospectiveid, connectionid, firstseen, lastseen)
      VALUES (:user, :retrospectiveid, :connectionid, :firstseen, :lastseen)
      ON CONFLICT(connectionid) DO UPDATE SET lastseen=:lastseen
    `, observation)
	if err != nil {
		log.Println("Error saving observation", err)
	}
	return nil
}

func (db *sqlRepository) ClearObservations(connectionid string) {
	db.Exec(`DELETE FROM observations WHERE connectionid=$1`, connectionid)
}

func (db *sqlRepository) GetActiveUsers(retrospectiveId string) []string {
	var users []string
	err := db.Select(&users, "SELECT DISTINCT user FROM observations WHERE retrospectiveid=$1 AND lastseen > $2 ORDER BY firstseen ASC", retrospectiveId, time.Now().Add(-10*time.Second))
	if err != nil {
		log.Println("Failed to select active users:", err)
	}
	return users
}
