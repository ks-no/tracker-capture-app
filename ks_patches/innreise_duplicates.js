import {
    DUPLIKAT_PROGRAM_ID, DUPLIKAT_INNREISE_STAGE_ID, DUPLIKAT_OPPFOLGING_STAGE_ID,
    INNREISE_ENTITY_TYPE,
    INNREISE_PROGRAM_ID, INNREISEINFORMASJON_PROGRAM_STAGE_ID, OPPFOLGING_STAGE_ID
} from "../utils/constants";

export function registerInnreiseDuplicateToExisting(selectedTei, existingTeiId, selectedEnrollment, optionSets, attributesById, orgId, teiService, enrollmentService, eventFactory) {
    return updateAndAddInnreise(selectedTei, existingTeiId, true, optionSets, attributesById, orgId, teiService, enrollmentService, eventFactory).then(() => {
        return closeDuplicate(selectedEnrollment, enrollmentService).then(() => {
            return existingTeiId;
        });
    });
}

export function registerNewInnreiseProfil(selectedTei, selectedEnrollment, optionSets, attributesById, orgId, teiService, enrollmentService, eventFactory) {
    return createProfile(selectedTei, optionSets, attributesById, teiService).then(newTeiId => {
        return updateAndAddInnreise(selectedTei, newTeiId, false, optionSets, attributesById, orgId, teiService, enrollmentService, eventFactory).then(() => {
            return closeDuplicate(selectedEnrollment, enrollmentService).then(() => {
                return newTeiId;
            });
        });
    });
}

function updateAndAddInnreise(selectedTei, existingTeiId, isExisting, optionSets, attributesById, orgId, teiService, enrollmentService, eventFactory) {
    return teiService.getWithProgramData(existingTeiId, isExisting ? INNREISE_PROGRAM_ID : DUPLIKAT_PROGRAM_ID, optionSets, attributesById).then(existingTei => {
        try {
            return updateProfile(selectedTei, existingTei, optionSets, attributesById, teiService).then(() => {
                if (isEnrolledInInnreise(existingTei)) {
                    return addInnreiseEvents(selectedTei, existingTei, innreiseEnrollmentCode(existingTei), eventFactory);
                } else {
                    addInnreiseEnrollment(selectedTei, existingTei, orgId, enrollmentService).then((response) => {
                        var enrollmentId = response.response.importSummaries[0].reference;
                        return addInnreiseEvents(selectedTei, existingTei, enrollmentId, eventFactory);
                    });
                }
            });
        } catch (err) {
            console.log(err)
            throw err;
        }
    });
}


function addInnreiseEnrollment(selectedTei, existingTei, orgId, enrollmentService) {
    var enrollment = createEnrollment(existingTei.trackedEntityInstance, orgId);
    return enrollmentService.enroll(enrollment);
}

function addInnreiseEvents(selectedTei, existingTei, enrollmentId, eventFactory) {

    selectedTei.enrollments.forEach(enrollment => {
        if (enrollment.program === DUPLIKAT_PROGRAM_ID) {
            enrollment.events.forEach(event => {
                try {
                    var newEvent = angular.copy(event);
                    newEvent.program = INNREISE_PROGRAM_ID;
                    newEvent.programStage = duplicateToInnreiseEventCode(event.programStage);
                    var id = Array.isArray(enrollmentId) ? enrollmentId[0] : enrollmentId;  // Needed to avoid "Event date is required."-error
                    newEvent.enrollment = id;
                    if (newEvent.notes) {
                        newEvent.notes = newEvent.notes.map(note => {
                            delete note.note; // Cannot reuse note ID
                            return note;
                        });
                    }
                    delete newEvent.event; // Cannot reuse event ID
                    if (newEvent.programStage) {
                        eventFactory.create(newEvent);
                    }
                } catch (err) {
                    console.log(err);
                    throw err;
                }
            });
        }
    });
}

function updateProfile(selectedTei, existingTei, optionSets, attributesById, teiService) {
    selectedTei.attributes.forEach((attribute) => {
        if (!existingTei.attributes.some((att) => att.attribute === attribute.attribute)) {
            existingTei.attributes.push(attribute);
        }
    });

    return teiService.update(existingTei, optionSets, attributesById);
}

function createProfile(selectedTei, optionSets, attributesById, teiService) {
    var apiTei = cleanTeiForCreate(selectedTei);
    return teiService.register(apiTei, optionSets, attributesById).then((response) => {
        return response.response.importSummaries[0].reference;
    });
}

function createEnrollment(exisitngTeiId, orgUnitId) {
    var enrollment = {};
    enrollment.trackedEntityInstance = exisitngTeiId;
    enrollment.program = INNREISE_PROGRAM_ID;
    enrollment.status = 'ACTIVE';
    enrollment.orgUnit = orgUnitId;
    return enrollment;
}

function cleanTeiForCreate(tei) {
    delete tei.enrollment;
    delete tei.programOwnersById;
    delete tei.relationships;
    delete tei.trackedEntityInstance;
    delete tei.trackedEntityType;
    tei.trackedEntityType = INNREISE_ENTITY_TYPE;
    return tei;
}


function duplicateToInnreiseEventCode(duplicateCode) {
    if (duplicateCode === DUPLIKAT_OPPFOLGING_STAGE_ID) {
        return OPPFOLGING_STAGE_ID;
    }
    if (duplicateCode === DUPLIKAT_INNREISE_STAGE_ID) {
        return INNREISEINFORMASJON_PROGRAM_STAGE_ID;
    }
    return undefined;
}

function isEnrolledInInnreise(tei) {
    return tei.enrollments.some(enrollment => enrollment.program === INNREISE_PROGRAM_ID && enrollment.status === 'ACTIVE');
}

function innreiseEnrollmentCode(tei) {
    return tei.enrollments.filter(enrollment => enrollment.program === INNREISE_PROGRAM_ID).map(enrollment => enrollment.enrollment);
}

function closeDuplicate(selectedEnrollment, enrollmentService) {
    var en = angular.copy(selectedEnrollment);
    en.status = 'COMPLETED';
    return enrollmentService.update(en);
}