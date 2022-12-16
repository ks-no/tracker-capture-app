/* global angular */

export function createNotificationForSms(smsMsg, phoneNumber, dateUtils, currentSelection, sessionStorageService, enrollmentService) {
    var selections = currentSelection.get();
    var enrollment = selections.selectedEnrollment && selections.selectedEnrollment.enrollment;
    if (enrollment) {
        var selectedEnrollment = selections.selectedEnrollment;

        var copiedEnrollment = angular.copy(selectedEnrollment);
        copiedEnrollment.incidentDate = dateUtils.formatFromUserToApi(copiedEnrollment.incidentDate);
        copiedEnrollment.enrollmentDate = dateUtils.formatFromUserToApi(copiedEnrollment.enrollmentDate);

        var noteText = `SMS sendt til ${phoneNumber}: ${smsMsg}`;
        var newNote = {
            value: noteText,
        };
        copiedEnrollment.notes = [newNote];
        enrollmentService.updateForNote(copiedEnrollment);
    }
}
