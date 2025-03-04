/* global trackerCapture, angular */

import {convertToCorrectDateString} from "../../utils/converters";

const {program} = require("babel-types");
import {
    DAYS_BEFORE_KLYNGE_START_TO_INCLUDE,
    DUPLIKAT_PROGRAM_ID,
    INDEKSERING_PROGRAM_ID,
    INNREISE_PROGRAM_ID, NAERKONTAKT_OPPFOLGING_PROGRAM_STAGE_ID,
    NAERKONTAKT_PROGRAM_ID
} from "../../utils/constants";
import {registerInnreiseDuplicateToExisting, registerNewInnreiseProfil} from "../../ks_patches/innreise_duplicates";

var trackerCapture = angular.module('trackerCapture');
trackerCapture.controller('RelationshipController',
    function ($scope,
              $rootScope,
              $modal,
              $location,
              TEIService,
              AttributesFactory,
              CurrentSelection,
              RelationshipFactory,
              RelationshipCallbackService,
              OrgUnitFactory,
              ProgramFactory,
              EnrollmentService,
              ModalService,
              CommonUtils,
              TEService,
              $timeout,
              $q,
              DHIS2EventFactory,
              TCStorageService,
              DateUtils) {
        $rootScope.showAddRelationshipDiv = false;
        $scope.relatedProgramRelationship = false;
        var ENTITYNAME = "TRACKED_ENTITY_INSTANCE";
        var allPrograms = [];

        $scope.relationshipsWidget = $rootScope.getCurrentWidget($scope);

    
        ProgramFactory.getAll().then(function (result) {
            allPrograms = result.programs;
        });

        //listen for the selected entity
        $scope.$on('dashboardWidgets', function(event, args) {
            // Add callback for updating relationships on Klynge program.
            if($scope.relationshipsWidget.customRelationship) {
                RelationshipCallbackService.addCallback((relationships) => {
                    $scope.selectedTei.relationships = relationships;
                    $scope.loadData($scope.selectedTei);
                });
            }
            $scope.loadData()
        });

        $scope.$on('$destroy', function iVeBeenDismissed() {
            if($scope.relationshipsWidget.customRelationship) {
                RelationshipCallbackService.clearCallbacks();
            }
        });

        $scope.loadData = function(selectedTei) {
            $scope.relationshipTypes = [];
            $scope.relationships = [];
            $scope.relatedTeis = [];
            $scope.selections = CurrentSelection.get();
            $scope.optionSets = $scope.selections.optionSets;
            if(!selectedTei) {
                $scope.selectedTei = angular.copy($scope.selections.tei);
            }
            $scope.attributesById = CurrentSelection.getAttributesById();

            $scope.relationshipPrograms = [];

            $scope.attributes = [];
            for(var key in $scope.attributesById){
                if($scope.attributesById.hasOwnProperty(key)){
                    $scope.attributes.push($scope.attributesById[key]);
                }
            }

            $scope.trackedEntityType = $scope.selections.te;
            $scope.selectedEnrollment = $scope.selections.selectedEnrollment;
            $scope.selectedProgram = $scope.selections.pr;
            $scope.programs = $scope.selections.prs;
            $scope.programsById = {};
            $scope.allProgramNames = {};
            ProgramFactory.getAllAccesses().then(function(data) {
                $scope.allProgramNames = data.programIdNameMap;
                $scope.accessByProgramId = data.programsById;
            });
            angular.forEach($scope.programs, function(program){
                $scope.programsById[program.id] = program;
            });

            RelationshipFactory.getAll().then(function(relTypes){
                $scope.relationshipTypes = relTypes.filter(function(relType){
                    return (relType.fromConstraint.trackedEntityType && relType.fromConstraint.trackedEntityType.id === $scope.trackedEntityType.id)
                        || (relType.toConstraint.trackedEntityType && relType.toConstraint.trackedEntityType.id === $scope.trackedEntityType.id);
                });

                angular.forEach($scope.relationshipTypes, function(rel){
                    $scope.relationships[rel.id] = rel;
                });

                setRelationships();
            });
            $scope.selectedOrgUnit = $scope.selections.orgUnit;
        }


        $scope.orderTeiBy = 'created';
        $scope.orderReverse = true;

        $scope.getTeiOrderValue = function (tei) {
            var val = tei[$scope.orderTeiBy] || tei.attributes[$scope.orderTeiBy];
            if (!val) {
                return undefined;
            }
            // Change from dd-mm-yyyy to yyyy-mm-dd to get proper ordering of dates using string sort
            var valAsDate = convertToCorrectDateString(val, 'yyyy-mm-dd');
            if (valAsDate) {
                return valAsDate;
            }
            return val;
        };

        $scope.setOrderTeiBy = function (field) {
            if (field && $scope.orderTeiBy !== field) {
                $scope.orderTeiBy = field;
                $scope.orderReverse = false;
            } else if (!$scope.orderReverse) {
                $scope.orderReverse = true;
            } else {
                $scope.orderTeiBy = 'created';
                $scope.orderReverse = true;
            }
        };

        $scope.showNaerkontaktImport = function () {
            $modal.open({
                templateUrl: 'components/naerkontakt_import/naerkontakt-import.html',
                controller: 'NaerkontaktImportController',
                windowClass: 'modal-full-window',
                resolve: {
                    relationshipTypes: function () {
                        return $scope.relationshipTypes;
                    },
                    selectedAttribute: function () {
                        return null;
                    },
                    existingAssociateUid: function () {
                        return null;
                    },
                    addingRelationship: function () {
                        return true;
                    },
                    selections: function () {
                        return $scope.selections;
                    },
                    selectedTei: function () {
                        return $scope.selectedTei;
                    },
                    selectedProgram: function () {
                        return $scope.selectedProgram;
                    },
                    relatedProgramRelationship: function () {
                        return $scope.relatedProgramRelationship;
                    },
                    allPrograms: function () {
                        return allPrograms;
                    },
                }
            });
        }

        $scope.showAddRelationship = function (related) {
            $scope.relatedProgramRelationship = related;
            $rootScope.showAddRelationshipDiv = !$rootScope.showAddRelationshipDiv;

            if ($rootScope.showAddRelationshipDiv) {
                var modalInstance = $modal.open({
                    templateUrl: 'components/teiadd/tei-add.html',
                    controller: 'TEIAddController',
                    windowClass: 'modal-full-window',
                    resolve: {
                        relationshipTypes: function () {
                            return $scope.relationshipTypes;
                        },
                        selectedAttribute: function () {
                            return null;
                        },
                        existingAssociateUid: function () {
                            return null;
                        },
                        addingRelationship: function () {
                            return true;
                        },
                        selections: function () {
                            return $scope.selections;
                        },
                        selectedTei: function () {
                            return $scope.selectedTei;
                        },
                        selectedProgram: function () {
                            return $scope.selectedProgram;
                        },
                        relatedProgramRelationship: function () {
                            return $scope.relatedProgramRelationship;
                        },
                        allPrograms: function () {
                            return allPrograms;
                        }
                    }
                });

                modalInstance.result.then(function (relationships) {
                    $scope.selectedTei.relationships = relationships;
                    setRelationships();
                });
            }
        };

        $scope.removeRelationship = function (rel) {

            var modalOptions = {
                closeButtonText: 'cancel',
                actionButtonText: 'delete',
                headerText: 'delete',
                bodyText: 'are_you_sure_to_delete_relationship'
            };

            ModalService.showModal({}, modalOptions).then(function (result) {

                var index = -1;
                for (var i = 0; i < $scope.selectedTei.relationships.length; i++) {
                    if ($scope.selectedTei.relationships[i].relationship === rel.relId) {
                        index = i;
                        break;
                    }
                }

                if (index !== -1) {
                    var relationshipToDelete = $scope.selectedTei.relationships.splice(index, 1);
                    RelationshipFactory.delete(rel.relId).then(function (response) {
                        setRelationships();
                    }, function (error) {
                        $scope.selectedTei.relationships.splice(index, 0, relationshipToDelete[0]);
                    });
                }
            });
        };

        $scope.showDashboard = function (teiId, program) {
            $location.path('/dashboard').search({tei: teiId, program: program, ou: $scope.selectedOrgUnit.id});
        };

        $scope.showEventInCaptureApp = function (eventId) {
            location.href = '../dhis-web-capture/index.html#/viewEvent/' + eventId;
        };

        $scope.shouldShowRelationshipBox = function (relationshipsWidget, relatedTeis) {
            if (!relationshipsWidget || !relationshipsWidget.customRelationship) {
                return true;
            }
            if (relationshipsWidget.customRelationship === 'other_org_owner' && !(relatedTeis && relatedTeis.length > 0)) {
                return false;
            }
            if (relationshipsWidget.customRelationship === 'other' && !(relatedTeis && relatedTeis.length > 0)) {
                return false;
            }
            return true;
        }

        $scope.shouldShowAddRelationshipLink = function (relationshipsWidget) {
            if (relationshipsWidget && (relationshipsWidget.customRelationship === 'other_org_owner' || relationshipsWidget.customRelationship === 'other')) {
                return false;
            }
            return true;
        }


        $scope.startDate;
        $scope.endDate;
        $scope.DAYS_BEFORE_KLYNGE_START_TO_INCLUDE = DAYS_BEFORE_KLYNGE_START_TO_INCLUDE;


        var pushRelative = function (relative) {
            $scope.startDate = moment(DateUtils.formatFromUserToApi($scope.selectedEnrollment.enrollmentDate));
            if (DAYS_BEFORE_KLYNGE_START_TO_INCLUDE) {
                $scope.startDate = $scope.startDate.subtract(DAYS_BEFORE_KLYNGE_START_TO_INCLUDE, "d"); // Add grace period for including index and contacts
            }
            angular.forEach($scope.selectedTei.attributes, function (attribute) {
                if (attribute.attribute == 'hD3CRC6rdv1') {
                    $scope.endDate = moment(DateUtils.formatFromUserToApi(attribute.value));
                }
            });

            if ($scope.relationshipsWidget.customRelationship == 'index') {
                if ($scope.checkIsValidIndexRelationAndUpdateRelative(relative, $scope.startDate, $scope.endDate)) {
                    $scope.relatedTeis.push(relative);
                }

            } else if ($scope.relationshipsWidget.customRelationship == 'contact') {
                var isInIndex = $scope.checkIsValidIndexRelationAndUpdateRelative(relative, $scope.startDate, $scope.endDate);
                if (!isInIndex && $scope.checkIsValidNaerkontaktRelationAndUpdateRelative(relative, $scope.startDate, $scope.endDate)) {
                    $scope.relatedTeis.push(relative);
                }

                $scope.updateIndicators(relative, $scope.startDate, $scope.endDate);
            } else if ($scope.relationshipsWidget.customRelationship == 'other_org_owner') {
                if (!$scope.hasAccessToRelativeProgram(relative, NAERKONTAKT_PROGRAM_ID) && !$scope.hasAccessToRelativeProgram(relative, INDEKSERING_PROGRAM_ID)) {
                    $scope.addOrgNameToProgramOwners(relative);
                    $scope.relatedTeis.push(relative);
                }
            } else if ($scope.relationshipsWidget.customRelationship == 'other') {
                var isInNotAccess = !$scope.hasAccessToRelativeProgram(relative, NAERKONTAKT_PROGRAM_ID) && !$scope.hasAccessToRelativeProgram(relative, INDEKSERING_PROGRAM_ID);
                var isInIndex = $scope.checkIsValidIndexRelationAndUpdateRelative(relative, $scope.startDate, $scope.endDate);
                var isInNaerkontakt = $scope.checkIsValidNaerkontaktRelationAndUpdateRelative(relative, $scope.startDate, $scope.endDate);

                if (!isInNotAccess && !isInIndex && !isInNaerkontakt) {
                    $scope.relatedTeis.push(relative);
                }
            } else {
                $scope.relatedTeis.push(relative);
            }
        }

        $scope.hasAccessToRelativeProgram = function (relative, programId) {
            var hasAccess = false;
            if (relative && relative.programOwners) {
                angular.forEach(relative.programOwners, function (programOwner) {
                    if (programOwner.program === programId && programOwner.ownerOrgUnit === $scope.selectedOrgUnit.id) {
                        hasAccess = true;
                    }
                });
            }
            return hasAccess;
        }

        $scope.checkIsValidIndexRelationAndUpdateRelative = function (relative, startDate, endDate) {
            relative.relationshipProgramConstraint.id = INDEKSERING_PROGRAM_ID;
            if (!$scope.hasAccessToRelativeProgram(relative, INDEKSERING_PROGRAM_ID)) {
                return false;
            }
            angular.forEach(relative.enrollments, function (enrollment) {
                if (enrollment.program == INDEKSERING_PROGRAM_ID) {
                    enrollment.incidentDate = DateUtils.formatFromApiToUser(enrollment.incidentDate);
                    var symptomsOnsetMoment = moment(DateUtils.formatFromUserToApi(enrollment.incidentDate));
                    if ((symptomsOnsetMoment.isSame(startDate) || symptomsOnsetMoment.isAfter(startDate)) && (!endDate || symptomsOnsetMoment.isBefore(endDate))) {
                        relative.symptomsOnsetMoment = symptomsOnsetMoment;
                        relative.symptomsOnset = enrollment.incidentDate;
                        relative.created = enrollment.incidentDate;
                    }
                }

            });
            if (relative.symptomsOnset) {
                return true;
            }
            return false;
        }

        $scope.checkIsValidNaerkontaktRelationAndUpdateRelative = function (relative, startDate, endDate) {
            relative.relationshipProgramConstraint.id = NAERKONTAKT_PROGRAM_ID;
            if (!$scope.hasAccessToRelativeProgram(relative, NAERKONTAKT_PROGRAM_ID)) {
                return false;
            }
            angular.forEach(relative.enrollments, function (enrollment) {
                if (enrollment.program == NAERKONTAKT_PROGRAM_ID) {
                    var contactDateMoment;

                    angular.forEach(enrollment.events, function (event) {
                        if ((!endDate || (moment(event.eventDate).isBefore(endDate) || moment(event.eventDate).isSame(endDate))) && (moment(event.eventDate).isAfter(startDate) || moment(event.eventDate).isSame(startDate)) && event.programStage == NAERKONTAKT_OPPFOLGING_PROGRAM_STAGE_ID) {
                            //this is the followup event in the contact program: event date is contact time.
                            if (!contactDateMoment || moment(event.eventDate).isBefore(contactDateMoment)) {
                                //only update the contact date if it is older than the previous one, we want the first contact date that is relevant
                                contactDateMoment = moment(event.eventDate);
                            }
                        }
                    });

                    if (contactDateMoment && (!endDate || contactDateMoment.isBefore(endDate))) {
                        relative.contactDateMoment = contactDateMoment;
                        relative.contactDate = DateUtils.formatFromApiToUser(contactDateMoment);

                        relative.created = DateUtils.formatFromApiToUser(contactDateMoment);

                    }
                }
            });
            if(relative.contactDate) {
                return true;
            }
            return false;
        }

        $scope.addOrgNameToProgramOwners = function (relative) {
            angular.forEach(relative.programOwners, programOwner => {
                TCStorageService.currentStore.get('organisationUnits', programOwner.ownerOrgUnit).done(function (orgUnit) {
                    programOwner.ownerOrgUnitName = orgUnit.displayName;
                });
            })
        }

        $scope.getOwnerOrgUnitName = function (relative) {
            var indeksOwner = relative.programOwners && relative.programOwners.filter(owner => owner.program === INDEKSERING_PROGRAM_ID);
            var naerkontaktOwner = relative.programOwners && relative.programOwners.filter(owner => owner.program === NAERKONTAKT_PROGRAM_ID);
            if (indeksOwner.length > 0) {
                return indeksOwner[0].ownerOrgUnitName;
            }
            if (naerkontaktOwner.length > 0) {
                return naerkontaktOwner[0].ownerOrgUnitName;
            }
            return 'Ukjent';
        };

        $scope.updateIndicators = function (relative, startDate, endDate) {
            if (relative.status == 'Death') {
                $scope.indicators.death++;
            }
            if (relative.status == 'HOSPITAL') {
                $scope.indicators.hospital++;
            }

            if (relative.mutation == 'true') {
                $scope.indicators.mutation++;
            }

            if (relative.condition == 'true') {
                $scope.indicators.underlyingCondition++;
            }

            if (relative.symptomsOnsetMoment && relative.symptomsOnsetMoment.isAfter(startDate.add(9, 'days'))) {
                $scope.indicators.positiveContact10++;
            }

            //Now indicators.
            if (relative.symptomsOnsetMoment && (!endDate || relative.symptomsOnsetMoment.isBefore(endDate))) {
                $scope.indicators.indexNow++;
            } else if (relative.contactDateMoment && (!endDate || relative.contactDateMoment.isBefore(endDate))) {
                $scope.indicators.contactNow++;
            }

            //D01 indicators.
            if (relative.symptomsOnsetMoment && relative.symptomsOnsetMoment.isBefore(startDate.add(1, 'days'))) {
                $scope.indicators.index1++;
            } else if (relative.contactDateMoment && (!endDate || relative.contactDateMoment.isBefore(endDate))) {
                $scope.indicators.contact1++;
            }

            //D10 indicators.
            if (relative.symptomsOnsetMoment && relative.symptomsOnsetMoment.isBefore(startDate.add(10, 'days'))) {
                $scope.indicators.index10++;
            } else if (relative.contactDateMoment && (!endDate || relative.contactDateMoment.isBefore(endDate))) {
                $scope.indicators.contact10++;
            }

            //D21 indicators.
            if (relative.symptomsOnsetMoment && relative.symptomsOnsetMoment.isBefore(startDate.add(21, 'days'))) {
                $scope.indicators.index21++;
            } else if (relative.contactDateMoment && (!endDate || relative.contactDateMoment.isBefore(endDate))) {
                $scope.indicators.contact21++;
            }

            //D30 indicators.
            if (relative.symptomsOnsetMoment && relative.symptomsOnsetMoment.isBefore(startDate.add(30, 'days'))) {
                $scope.indicators.index30++;
            } else if (relative.contactDateMoment && (!endDate || relative.contactDateMoment.isBefore(endDate))) {
                $scope.indicators.contact30++;
            }
        }

        var setRelationships = function () {
            $scope.indicators = {};
            $scope.indicators.indexNow = 0;
            $scope.indicators.contactNow = 0;
            $scope.indicators.index1 = 0;
            $scope.indicators.contact1 = 0;
            $scope.indicators.index10 = 0;
            $scope.indicators.contact10 = 0;
            $scope.indicators.index21 = 0;
            $scope.indicators.contact21 = 0;
            $scope.indicators.index30 = 0;
            $scope.indicators.contact30 = 0;
            $scope.indicators.death = 0;
            $scope.indicators.hospital = 0;
            $scope.indicators.underlyingCondition = 0;
            $scope.indicators.mutation = 0;
            $scope.indicators.positiveContact10 = 0;


            $scope.relatedTeis = [];
            $scope.relatedEvents = [];
            $scope.relationshipPrograms = [];
            $scope.relationshipAttributes = [];
            var relationshipProgram = {};
            var relationshipType = {};


            var teServicePromise = TEService.getAll().then(function (teiTypes) {
                        //Loop through all relationships.
                        var queries = [];

                        angular.forEach($scope.selectedTei.relationships, function (rel) {

                            var isValidToRelationship = rel.to && rel.to.trackedEntityInstance && rel.to.trackedEntityInstance.trackedEntityInstance !== $scope.selectedTei.trackedEntityInstance;
                            var isValidFromRelationship = rel.from && rel.bidirectional && rel.from.trackedEntityInstance && rel.from.trackedEntityInstance.trackedEntityInstance !== $scope.selectedTei.trackedEntityInstance;
                            var isValidBidirectionalRelationship = rel.from && rel.bidirectional && rel.from.event && rel.from.event.event;

                            var teiId = isValidToRelationship ? rel.to.trackedEntityInstance.trackedEntityInstance : rel.from.trackedEntityInstance.trackedEntityInstance;

                            if (isValidToRelationship || isValidFromRelationship) {
                                queries.push(TEIService.getTeiWithAllAvailableFields(teiId, $scope.optionSets, $scope.attributesById).then(function (tei) {
                                        relationshipType = $scope.relationshipTypes.find(function (relType) {
                                            return relType.id === rel.relationshipType;
                                        });
                                        relationshipProgram = isValidToRelationship ? relationshipType.toConstraint.program : relationshipType.fromConstraint.program;
                                        var relName = isValidToRelationship ? relationshipType.fromToName : relationshipType.toFromName;
                                        if (!relationshipProgram && $scope.selectedProgram) {
                                            relationshipProgram = {id: $scope.selectedProgram.id};
                                        }

                                        var relative = {
                                            ...tei, // copy the whole tei to omit extra calls to backend
                                            trackedEntityInstance: teiId,
                                            relName: relName,
                                            relId: rel.relationship,
                                            attributes: getRelativeAttributes(tei.attributes),
                                            relationshipProgramConstraint: relationshipProgram,
                                            relationshipType: relationshipType,
                                            created: rel.created,
                                            programOwners: tei.programOwners,
                                        };

                                        if (relationshipType && teiTypes.filter(function (teiType) {
                                            return teiType.id === tei.trackedEntityType;
                                        }).length > 0) {
                                            var teiType = teiTypes.find(function (teiType) {
                                                return teiType.id === tei.trackedEntityType;
                                            });
                                            angular.forEach(teiType.trackedEntityTypeAttributes, function (attribute) {
                                                if ($scope.relationshipAttributes.length > 0 && $scope.relationshipAttributes.filter(function (att) {
                                                    return att.id === attribute.id;
                                                }).length === 0) {
                                                    $scope.relationshipAttributes.push(attribute);
                                                } else if ($scope.relationshipAttributes.length === 0) {
                                                    $scope.relationshipAttributes.push(attribute);
                                                }
                                            });
                                        }
                                        pushRelative(relative);
                                    }
                                ));
                            } else if (isValidBidirectionalRelationship) {
                                var event = null;
                                DHIS2EventFactory.getEventWithoutRegistration(rel.from.event.event).then(function (e) {
                                    event = e;

                                    relationshipType = $scope.relationshipTypes.find(function (relType) {
                                        return relType.id === rel.relationshipType
                                    });
                                    var relName = relationshipType.toFromName;

                                    relationshipProgram = relationshipType.fromConstraint.program;

                                    if (!relationshipProgram && $scope.selectedProgram) {
                                        relationshipProgram = {id: $scope.selectedProgram.id};
                                    }

                                    var convertedEventDate = DateUtils.formatFromApiToUser(event.eventDate);
                                    var isDeleteable = !$scope.selectedTei.inactive && relationshipType.access.data.write && $scope.trackedEntityType.access.data.write && $scope.accessByProgramId[event.program].data.write;

                                    var eventToDisplay = {
                                        eventId: rel.from.event.event,
                                        eventDate: convertedEventDate,
                                        program: $scope.allProgramNames[event.program],
                                        status: event.status,
                                        orgUnit: event.orgUnitName,
                                        relName: relName,
                                        relId: rel.relationship,
                                        relationshipProgramConstraint: relationshipProgram,
                                        relationshipType: relationshipType,
                                        isDeleteable: isDeleteable
                                    };
                                    $scope.relatedEvents.push(eventToDisplay);
                                });
                            }

                        })
                        ;
                        return $q.all(queries);
                    }
                )
            ;

            var selections = CurrentSelection.get();
            CurrentSelection.set({
                tei: $scope.selectedTei,
                te: $scope.trackedEntityType,
                prs: selections.prs,
                pr: $scope.selectedProgram,
                prNames: selections.prNames,
                prStNames: selections.prStNames,
                enrollments: selections.enrollments,
                selectedEnrollment: $scope.selectedEnrollment,
                optionSets: selections.optionSets,
                orgUnit: selections.orgUnit
            });

//todo, collect promises and broadcase once done.
            teServicePromise.then(function () {
                if ($scope.relationshipsWidget.customRelationship == 'contact') {
                    $rootScope.customConstants = [];

                    $rootScope.customConstants.push({
                        id: 'NAantalldNA',
                        type: 'TEXT',
                        value: 'Ind:' + $scope.indicators.indexNow + " Nær:" + $scope.indicators.contactNow
                    });

                    if ($scope.indicators.index1 || $scope.indicators.contact1) {
                        $rootScope.customConstants.push({
                            id: '01antalld01',
                            type: 'TEXT',
                            value: 'Ind:' + $scope.indicators.index1 + " Nær:" + $scope.indicators.contact1
                        });
                    }

                    if ($scope.indicators.index10 || $scope.indicators.contact10) {
                        $rootScope.customConstants.push({
                            id: '10antalld10',
                            type: 'TEXT',
                            value: 'Ind:' + $scope.indicators.index10 + " Nær:" + $scope.indicators.contact10
                        });
                    }

                    if ($scope.indicators.index21 || $scope.indicators.contact21) {
                        $rootScope.customConstants.push({
                            id: '21antalld21',
                            type: 'TEXT',
                            value: 'Ind:' + $scope.indicators.index21 + " Nær:" + $scope.indicators.contact21
                        });
                    }

                    if ($scope.indicators.index30 || $scope.indicators.contact30) {
                        $rootScope.customConstants.push({
                            id: '30antalld30',
                            type: 'TEXT',
                            value: 'Ind:' + $scope.indicators.index30 + " Nær:" + $scope.indicators.contact30
                        });
                    }


                    $rootScope.customConstants.push({
                        id: 'antDodsfall',
                        type: 'TEXT',
                        value: $scope.indicators.death ? $scope.indicators.death : '0'
                    });

                    $rootScope.customConstants.push({
                        id: 'antinnsykhu',
                        type: 'TEXT',
                        value: $scope.indicators.hospital ? $scope.indicators.hospital : '0'
                    });

                    $rootScope.customConstants.push({
                        id: 'alvorHelset',
                        type: 'TEXT',
                        value: $scope.indicators.underlyingCondition ? $scope.indicators.underlyingCondition : '0'
                    });

                    $rootScope.customConstants.push({
                        id: 'mutasjon123',
                        type: 'TEXT',
                        value: $scope.indicators.mutation
                    });

                    $rootScope.customConstants.push({
                        id: 'naerPos10dg',
                        type: 'TEXT',
                        value: $scope.indicators.positiveContact10 ? $scope.indicators.positiveContact10 : '0'
                    });

                    $rootScope.$broadcast('relationshipIndicatorsUpdated', $scope.indicators);
                }
            });
        }


        var getRelativeAttributes = function (teiAttributes) {
            var attributes = {};
            teiAttributes.forEach(function (attr) {
                if (attr.attribute && $scope.attributesById[attr.attribute]) {
                    attr.value = CommonUtils.formatDataValue(null, attr.value, $scope.attributesById[attr.attribute], $scope.optionSets, 'USER');
                }
                attributes[attr.attribute] = attr.value;
            });
            return attributes;
        };

//Function for getting all attributeIDs that a specific program has.
        var getProgramAttributes = function (attributeArray) {
            var programAttributes = [];

            angular.forEach(attributeArray, function (attribute) {
                programAttributes.push(attribute.trackedEntityAttribute.id);
            });

            return programAttributes;
        };
        $scope.isDuplikatsjekk = function () {
            return $scope.selectedProgram && $scope.selectedProgram.id === DUPLIKAT_PROGRAM_ID;
        };

        $scope.registerNewInInnreise = function () {
            var modalOptions = {
                headerText: 'Registrer som ny',
                bodyText: 'Vil du registrere som ny person? Det vil opprettes ny person i innreiseregistrering.'
            };
            ModalService.showModal({}, modalOptions).then(() => {
                registerNewInnreiseProfil($scope.selectedTei, $scope.selectedEnrollment, $scope.optionSets, $scope.attributesById, $scope.selectedOrgUnit.id, TEIService, EnrollmentService, DHIS2EventFactory).then((newTeiId) => {
                    $location.path('/dashboard').search({
                        tei: newTeiId,
                        program: INNREISE_PROGRAM_ID,
                        ou: $scope.selectedOrgUnit.id
                    });

                });
            });
        };
        $scope.addToDuplicateAndAddInnreise = function (rel) {
            var modalOptions = {
                headerText: 'Ønsker du å slå sammen  personprofilene?',
                bodyText: 'Importert informasjon fra innreiseregisteret vil legge seg i tomme felt i profilen. Der hvor det alledere ligger informasjon i feltene vil ny informasjon legges som et notat på profilen.' +
                    'Ingen informasjon vil bli overskrevet i Fiks innreiseoppfølging.'
            };
            ModalService.showModal({}, modalOptions).then(() => {
                registerInnreiseDuplicateToExisting($scope.selectedTei, rel.trackedEntityInstance, $scope.selectedEnrollment, $scope.optionSets, $scope.attributesById, $scope.selectedOrgUnit.id, TEIService, EnrollmentService, DHIS2EventFactory).then((newTeiId) => {
                    $location.path('/dashboard').search({
                        tei: newTeiId,
                        program: INNREISE_PROGRAM_ID,
                        ou: $scope.selectedOrgUnit.id
                    });

                });
            });
        };

        $scope.shouldShowExcelUpload = function (widget) {
            return widget.title === "Nærkontakter";
        }
    });


// WEBPACK FOOTER //
// ./components/relationship/relationship-controller.js

// https://covid19.fiks.test.ks.no/api/trackedEntityInstances/XEPHJ7USLfN.json?fields=trackedEntityInstance,programOwners,attributes
