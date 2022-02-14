import React from "react";
import { useQuery } from "@apollo/client";
import { useParams } from 'react-router-dom';
import { GET_RETROSPECTIVE_ID } from "../queries";

function WithPetNameToID(props) {
    const { petName } = useParams();
    const { loading, error, data } = useQuery(GET_RETROSPECTIVE_ID, {
        variables: { petName },
    });

    if (!data || !data.retrospectiveByPetName) {
        return (
            <div className="page-retrospective">
                <div className={"retrospective-loading" + (loading ? "" : " loading-finished")}>
                    <pre className="loading-text">
                        R  O  C  K  E  T  B  O  A  R  D
                    </pre>
                </div>
            </div>
        )
    }
    return (<props.component id={data.retrospectiveByPetName.id}/>);
};

export default WithPetNameToID;
