package sql

import (
	"log"
	"time"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

func (db *sqlRepository) getObservation(connectionid string) (*model.Observation, error) {
	var observation model.Observation
	err := db.Get(&observation, "SELECT * FROM observation WHERE connectionid=$1", connectionid)
	return &observation, err
}

func (db *sqlRepository) Observe(connectionid string, user string, retrospectiveId string, state string) (bool, error) {
	tx := db.MustBegin()
	defer tx.Commit()
	userState, _ := model.UserStateTypeString(state)

	observation := model.Observation{
		User:            user,
		RetrospectiveId: retrospectiveId,
		ConnectionId:    connectionid,
		State:           userState,
		FirstSeen:       time.Now(),
		LastSeen:        time.Now(),
	}
	oldObservation, err := db.getObservation(connectionid)

	changed := err != nil || observation.State != oldObservation.State

	_, err = db.NamedExec(`INSERT INTO observations
      ("user", retrospectiveid, connectionid, state, firstseen, lastseen)
      VALUES (:user, :retrospectiveid, :connectionid, :state, :firstseen, :lastseen)
      ON CONFLICT(connectionid) DO UPDATE SET lastseen=:lastseen, state=:state
    `, observation)
	if err != nil {
		log.Println("Error saving observation", err)
	}

	return changed, err
}

func (db *sqlRepository) ClearObservations(connectionid string) {
	db.Exec(`DELETE FROM observations WHERE connectionid=$1`, connectionid)
}

func (db *sqlRepository) GetActiveUsers(retrospectiveId string) ([]model.UserState, error) {
	var userStates []model.UserState
	err := db.Unsafe().Select(&userStates, "SELECT DISTINCT \"user\", max(state) as state, min(firstseen) as firstseen FROM observations WHERE retrospectiveid=$1 AND lastseen > $2 GROUP BY \"user\" ORDER BY firstseen ASC", retrospectiveId, time.Now().Add(-10*time.Second))
	if err != nil {
		log.Println("Failed to select active users:", err)
	}
	return userStates, err
}
