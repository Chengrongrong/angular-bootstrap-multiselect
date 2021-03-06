(function () {
    'use strict';

    var multiselect = angular.module('btorfs.multiselect', ['btorfs.multiselect.templates'])
      .factory('directiveFocus', function ($rootScope, $timeout) {
        return function(name) {
          $timeout(function (){
            $rootScope.$broadcast('focusOn', name);
          });
        }
      })

    multiselect.getRecursiveProperty = function (object, path) {
        return path.split('.').reduce(function (object, x) {
            if (object) {
                return object[x];
            } else {
                return null;
            }
        }, object)
    };

    multiselect.directive('multiselect', ['$filter', '$document', '$log', 'directiveFocus', function ($filter, $document, $log, directiveFocus) {
        return {
            restrict: 'AE',
            scope: {
                options: '=',
                displayProp: '@',
                idProp: '@',
                searchLimit: '=?',
                selectionLimit: '=?',
                showSelectAll: '=?',
                showUnselectAll: '=?',
                showSearch: '=?',
                searchFilter: '=?',
                disabled: '=?ngDisabled',
                labels: '=?',
                classesBtn: '=?',
                showTooltip: '=?',
                placeholder: '@?',
                fetchSearchFilterData: '=?'
            },
            require: 'ngModel',
            templateUrl: 'multiselect.html',
            controller: ['$scope', function($scope) {
                if (angular.isUndefined($scope.classesBtn)) {
                    $scope.classesBtn = ['btn-block','btn-default'];
                }
            }],
            link: function ($scope, $element, $attrs, $ngModelCtrl) {
                $scope.selectionLimit = $scope.selectionLimit || 0;
                $scope.searchLimit = $scope.searchLimit || 25;

                $scope.searchFilter = '';
                $scope.isFocusOn = $scope.showSearch == 1 || $scope.showSearch == true ? true:false;

                $scope.resolvedOptions = [];
                if (typeof $scope.options !== 'function') {
                  if(typeof $scope.options == 'undefined'){
                    $scope.resolvedOptions = []
                  }else{
                    $scope.resolvedOptions = $scope.options;
                  }
                }

                if (typeof $attrs.disabled != 'undefined') {
                    $scope.disabled = true;
                }


                var closeHandler = function (event) {
                    if (!$element[0].contains(event.target)) {
                        $scope.$apply(function () {
                            $scope.open = false;
                        });
                    }
                };

                $document.on('click', closeHandler);

                var updateSelectionLists = function () {
                    if (!$ngModelCtrl.$viewValue) {
                        if ($scope.selectedOptions) {
                            $scope.selectedOptions = [];
                        }
                        $scope.unselectedOptions = $scope.resolvedOptions.slice(); // Take a copy
                    } else {
                      /*
                        2020-11-23 Rong modify, hope follow click seq display
                        code 101 original code >> $scope.selectedOptions = $scope.resolvedOptions.filter(function (el) {
                        and
                        not have code 86~89, Rong add process same value
                      */
                      if(!$scope.selectedOptions && $ngModelCtrl.$viewValue.length > 0){
                        $scope.selectedOptions = [];
                        var tmpOptions = $ngModelCtrl.$viewValue.slice();  // Take a copy
                        for(var i = 0; i < tmpOptions.length; i++){

                          if(!tmpOptions[i]){
                            continue;
                          }else{
                            var id = tmpOptions[i].id;
                            for(var j = 0; j < $scope.resolvedOptions.length; j++){
                              var findId = $scope.resolvedOptions[j].id;
                              if(id == findId){
                                $scope.selectedOptions.push($scope.resolvedOptions[j]);
                                break;
                              } // if
                            } // for
                          } // if

                        } // for
                      }else if(!$scope.selectedOptions){
                        $scope.selectedOptions = [];
                      } // if // if

                      var tmpSelectedOptions = $scope.resolvedOptions.filter(function (el) {
                            var id = $scope.getId(el);
                            for (var i = 0; i < $ngModelCtrl.$viewValue.length; i++) {
                                var selectedId = $scope.getId($ngModelCtrl.$viewValue[i]);
                                if (id === selectedId) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        $scope.unselectedOptions = $scope.resolvedOptions.filter(function (el) {
                            // original => $scope.selectedOptions.indexOf(el)
                            return tmpSelectedOptions.indexOf(el) < 0;
                        });
                    }
                };

                $scope.toggleDropdown = function () {
                    $scope.open = !$scope.open;
                    $scope.resolvedOptions = $scope.options;

                    if($scope.searchFilter){
                      $scope.searchFilter = '';
                    } // if

                    updateSelectionLists();

                    if($scope.isFocusOn){
                      directiveFocus('searchFilter')
                    }
                };

                $ngModelCtrl.$render = function () {
                    updateSelectionLists();
                };

                $ngModelCtrl.$viewChangeListeners.push(function () {
                    updateSelectionLists();
                });

                $ngModelCtrl.$isEmpty = function (value) {
                    if (value) {
                        return (value.length === 0);
                    } else {
                        return true;
                    }
                };

                var watcher = $scope.$watch('selectedOptions', function () {
                    $ngModelCtrl.$setViewValue(angular.copy($scope.selectedOptions));
                }, true);

                $scope.$on('$destroy', function () {
                    $document.off('click', closeHandler);
                    if (watcher) {
                        watcher(); // Clean watcher
                    }
                });
                // Rong add process pre-fill data to display text content
                function getReturnText(items){
                  var totalSelected = angular.isDefined(items) ? items.length : 0;
                  if (totalSelected === 0) {
                    return $scope.labels && $scope.labels.select ? $scope.labels.select : ($scope.placeholder || 'Select');
                  } else {
                    return totalSelected + ' ' + ($scope.labels && $scope.labels.itemsSelected ? $scope.labels.itemsSelected : 'selected');
                  }
                }
                $scope.getButtonText = function () {
                    if ($scope.selectedOptions && $scope.selectedOptions.length === 1) {
                      return $scope.getDisplay($scope.selectedOptions[0]);
                    }else if($scope.selectedOptions && $scope.selectedOptions.length == 0 && $ngModelCtrl.$viewValue && $ngModelCtrl.$viewValue.length == 1){
                      // Rong add process pre-fill data to display text content
                      return $scope.getDisplay($ngModelCtrl.$viewValue[0]);
                    } // if

                    if($scope.selectedOptions && $scope.selectedOptions.length > 1){
                      return getReturnText($scope.selectedOptions)
                    }else if($ngModelCtrl.$viewValue && $ngModelCtrl.$viewValue.length > 1){ // Rong add process pre-fill data to display text content
                      return getReturnText($ngModelCtrl.$viewValue)
                    } else {
                        return $scope.labels && $scope.labels.select ? $scope.labels.select : ($scope.placeholder || 'Select');
                    }
                };

                $scope.selectAll = function () {
                    $scope.selectedOptions = $scope.resolvedOptions.slice(); // Take a copy;
                    $scope.unselectedOptions = [];
                };

                $scope.unselectAll = function () {
                    $scope.selectedOptions = [];
                    $scope.unselectedOptions = $scope.resolvedOptions.slice(); // Take a copy;
                };

                $scope.toggleItem = function (item) {
                    if (typeof $scope.selectedOptions === 'undefined') {
                        $scope.selectedOptions = [];
                    }
                    var selectedIndex = $scope.selectedOptions.indexOf(item);
                    var currentlySelected = (selectedIndex !== -1);
                    if (currentlySelected) {
                        $scope.unselectedOptions.push($scope.selectedOptions[selectedIndex]);
                        $scope.selectedOptions.splice(selectedIndex, 1);
                    } else if (!currentlySelected && ($scope.selectionLimit === 0 || $scope.selectedOptions.length < $scope.selectionLimit || $scope.selectionLimit == 1)) {
                        // Rong add if selectionLimit == 1 is the user maybe need swap items
                        if($scope.selectionLimit == 1){
                          $scope.selectedOptions = [item];
                        }else{
                          var unselectedIndex = $scope.unselectedOptions.indexOf(item);
                          $scope.unselectedOptions.splice(unselectedIndex, 1);
                          $scope.selectedOptions.push(item);
                        }

                        // type only number, but not input string
                        if(typeof($scope.selectionLimit) == 'number'){
                          var _length = $scope.selectedOptions.length;
                          if($scope.selectionLimit == _length){
                            $scope.open = false;
                            $scope.searchFilter = '';
                            $scope.updateOptions();
                          } // if
                        } // if
                    }
                };

                $scope.getId = function (item) {
                    if (angular.isString(item)) {
                        return item;
                    } else if (angular.isObject(item)) {
                        if ($scope.idProp) {
                            return multiselect.getRecursiveProperty(item, $scope.idProp);
                        } else {
                            $log.error('Multiselect: when using objects as model, a idProp value is mandatory.');
                            return '';
                        }
                    } else {
                        return item;
                    }
                };

                $scope.getDisplay = function (item) {
                    if (angular.isString(item)) {
                        return item;
                    } else if (angular.isObject(item)) {
                        if ($scope.displayProp) {
                            return multiselect.getRecursiveProperty(item, $scope.displayProp);
                        } else {
                            $log.error('Multiselect: when using objects as model, a displayProp value is mandatory.');
                            return '';
                        }
                    } else {
                        return item;
                    }
                };

                $scope.isSelected = function (item) {
                    if (!$scope.selectedOptions) {
                        return false;
                    }
                    var itemId = $scope.getId(item);
                    for (var i = 0; i < $scope.selectedOptions.length; i++) {
                        var selectedElement = $scope.selectedOptions[i];
                        if ($scope.getId(selectedElement) === itemId) {
                            return true;
                        }
                    }
                    return false;
                };

                $scope.updateOptions = function () {
                    if (typeof $scope.options === 'function') {
                        $scope.options().then(function (resolvedOptions) {
                            $scope.resolvedOptions = resolvedOptions;
                            updateSelectionLists();
                        });
                    }

                    if($scope.fetchSearchFilterData && typeof($scope.fetchSearchFilterData) === 'function'){
                      var returnData = { filterStr: $scope.searchFilter };
                      var _unselectedOptions = $scope.unselectedOptions
                      var count = 0;
                      for(var idx in _unselectedOptions){
                        if(_unselectedOptions[idx].name && _unselectedOptions[idx].name.toLowerCase().indexOf($scope.searchFilter.toLowerCase()) > -1){
                          count++;
                        } // if
                        if(count > 0){
                          returnData.isHaveSelectedData = true;
                          break;
                        } // if
                      } // for
                      $scope.fetchSearchFilterData(returnData);
                    }

                };

                // This search function is optimized to take into account the search limit.
                // Using angular limitTo filter is not efficient for big lists, because it still runs the search for
                // all elements, even if the limit is reached
                $scope.search = function () {
                    var counter = 0;
                    return function (item) {
                        if (counter > $scope.searchLimit) {
                            return false;
                        }
                        var displayName = $scope.getDisplay(item);
                        if (displayName) {
                            var result = displayName.toLowerCase().indexOf($scope.searchFilter.toLowerCase()) > -1;
                            if (result) {
                                counter++;
                            }
                            return result;
                        }
                    }
                };

            }
        };
    }]);

}());

angular.module('btorfs.multiselect.templates', ['multiselect.html']);

angular.module("multiselect.html", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("multiselect.html",
    "<style>.bootstrap-multiselect-scrollable{ height: 25vw;max-height: 30vw;overflow-x: hidden;}</style>\n" +
    "<div class=\"btn-group\" style=\"width: 100%\">\n" +
    "    <button type=\"button\" class=\"btn dropdown-toggle\" ng-class=\"classesBtn\" ng-click=\"toggleDropdown()\" ng-disabled=\"disabled\" style=\"white-space: nowrap; overflow-x: hidden; text-overflow: ellipsis;\">\n" +
    "        {{getButtonText()}}&nbsp;<span class=\"caret\"></span>\n" +
    "    </button>\n" +
    "    <ul class=\"dropdown-menu dropdown-menu-form\"\n" + "ng-class=\"{'bootstrap-multiselect-scrollable': options.length > 15}\"\n" +
    // "        ng-style=\"{display: open ? 'block' : 'none'}\" style=\"width: 100%; overflow-x: auto\">\n" +
    "        ng-style=\"{display: open ? 'block' : 'none'}\" style=\"overflow-x: auto\">\n" +
    "\n" +
    "        <li ng-show=\"showSelectAll\">\n" +
    "            <a ng-click=\"selectAll()\" href=\"\">\n" +
    "                <span class=\"glyphicon glyphicon-ok\"></span> {{labels.selectAll || 'Select All'}}\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-show=\"showUnselectAll\">\n" +
    "            <a ng-click=\"unselectAll()\" href=\"\">\n" +
    "                <span class=\"glyphicon glyphicon-remove\"></span> {{labels.unselectAll || 'Unselect All'}}\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-show=\"(showSelectAll || showUnselectAll)\"\n" +
    "            class=\"divider\">\n" +
    "        </li>\n" +
    "\n" +
    "        <li role=\"presentation\" ng-repeat=\"option in selectedOptions\" class=\"active\">\n" +
    "            <a class=\"item-selected\" href=\"\" title=\"{{showTooltip ? getDisplay(option) : ''}}\" ng-click=\"toggleItem(option); $event.stopPropagation()\" style=\"overflow-x: hidden;text-overflow: ellipsis\">\n" +
    "                <span class=\"glyphicon glyphicon-remove\"></span>\n" +
    "                {{getDisplay(option)}}\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-show=\"selectedOptions.length > 0\" class=\"divider\"></li>\n" +
    "\n" +
    "        <li ng-show=\"showSearch\">\n" +
    "            <div class=\"dropdown-header\">\n" +
    "                <input type=\"text\" class=\"form-control input-sm\" style=\"width: 100%;\"\n" +
    "                       ng-model=\"searchFilter\" placeholder=\"{{labels.search || 'Search...'}}\" ng-change=\"updateOptions()\" focus-on=\"searchFilter\">\n" +
    "            </div>\n" +
    "        </li>\n" +
    "\n" +
    "        <li ng-show=\"showSearch\" class=\"divider\"></li>\n" +
    "        <li role=\"presentation\" ng-repeat=\"option in unselectedOptions | filter:search() | limitTo: searchLimit\"\n" +
    "            ng-if=\"!isSelected(option)\"\n" +
    "            ng-class=\"{disabled : selectionLimit && selectionLimit != 1 && selectedOptions.length >= selectionLimit}\">\n" +
    "            <a class=\"item-unselected\" href=\"\" ng-class=\"{{option.customClass}}\" title=\"{{showTooltip ? getDisplay(option) : ''}}\" ng-click=\"toggleItem(option); $event.stopPropagation()\" style=\"overflow-x: hidden;text-overflow: ellipsis\">\n" +
    "                {{getDisplay(option)}}\n" +
    "            </a>\n" +
    "        </li>\n" +
    "\n" +
    "        <li class=\"divider\" ng-show=\"selectionLimit > 1\"></li>\n" +
    "        <li role=\"presentation\" ng-show=\"selectionLimit > 1\">\n" +
    "            <a>{{selectedOptions.length || 0}} / {{selectionLimit}} {{labels.itemsSelected || 'selected'}}</a>\n" +
    "        </li>\n" +
    "\n" +
    "    </ul>\n" +
    "</div>\n" +
    "");
}]);
