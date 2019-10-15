class Game{
    constructor(terrainsInput, citiesInput){
        this.Map = null;
        this.Terrains = terrainsInput;
        this.Cities = citiesInput;
        this.BestCost = 0;
        this.BestRoads = [];
    }

    start(){
        this.Map = this._buildMap();
        this._solveMap();
    }

    _buildMap(){
        let map = new Map();
        map._buildDOMObj();
        document.querySelector("body").appendChild(map.DOMObj);

        let serializer = new InputSerializer();
        this.Terrains = serializer.serialize(InputTypeEnum.Terrains, this.Terrains);
        this.Cities = serializer.serialize(InputTypeEnum.Cities, this.Cities);

        for(let i = 0 ; i < this.Terrains.length ; i++){
            let rowDOMObj = document.createElement("div");
            rowDOMObj.className = "hex-row";
            let tileRow = [];
            for(let y = 0 ; y < this.Terrains[i].length ; y++){
                let tile = new Tile(this.Terrains[y][i]);
                tile._buildDOMObj();
                rowDOMObj.appendChild(tile.DOMObj);
                tileRow.push(tile);
                map.DOMObj.appendChild(rowDOMObj);
            }
            map._addTilesRow(tileRow);
        }
        
        this.Cities.forEach(city => {
            map.Tiles[city.Coordinates.Row][city.Coordinates.Column].City = city;
            map.Tiles[city.Coordinates.Row][city.Coordinates.Column].DOMObj.classList.add("have-city");
        });
        return map;
    }

    _solveMap(){
        this._getRoadsForMissingResources();
        this.Cities.forEach(city => {
            this.BestCost = null;
            this._findBestRoadsCombination(city, null, 0, []);
            city.BestHistoryByResource = Object.assign({} , this.BestRoads);
        });
        this._drawFinalSolution();
    }

    _drawFinalSolution(){
        this.Cities.map(c => c.BestHistoryByResource).forEach(bestHistoryModels => {
            let citiesToContent = Object.keys(bestHistoryModels).length;
            for(let i = 0 ; i < citiesToContent ; i++){
                let roadsContent = Object.keys(bestHistoryModels[i].Roads).length;
                for(let y = 0 ; y < roadsContent ; y++){
                    let road = bestHistoryModels[i].Roads[y];
                    this.Map.Tiles[road.Row][road.Column].buildRoad();
                }
            }
        });
    }

    _getRoadsForMissingResources(){
        this.Cities.forEach(city => {
            let missingResources = this._getMissingResources(city);
            if(missingResources.length){
                missingResources.forEach(resource => {
                    let requiredCities = this._getCitiesByResource(resource);
                    requiredCities.forEach(requiredCity => {
                        this._markPoint(city, false);
                        this._markPoint(requiredCity, false);

                        let shortestRoad = this._getShortestRoad(city.Coordinates, requiredCity.Coordinates, [city.Coordinates], 0, true);
                        this._destroyAllRoads();       
                        this.BestCost = shortestRoad.Cost;
                        this.BestRoads = Object.assign({}, shortestRoad.Road);

                        this._getLowestCostRoad(city.Coordinates, requiredCity.Coordinates, null, [city.Coordinates], 0, shortestRoad.Cost);
                        if(!city.BestHistoryByResource[resource])
                            city.BestHistoryByResource[resource] = [];
                        city.BestHistoryByResource[resource].push({"City": requiredCity, "Cost": this.BestCost, "Roads": this.BestRoads});
                        
                        this._markPoint(city, true);
                        this._markPoint(requiredCity, true);
                    });
                });
            }
        });
    }

    _markPoint(point, unMark){
        if(!unMark)
            this.Map.Tiles[point.Coordinates.Row][point.Coordinates.Column].DOMObj.classList.add("running-now");
        else
            this.Map.Tiles[point.Coordinates.Row][point.Coordinates.Column].DOMObj.classList.remove("running-now");
    }

    _findBestRoadsCombination(city, bestCityRoad, currentCost, moveHistory){
        if(bestCityRoad)
            city.ConnectedCities.push(bestCityRoad);
        let missingResources = this._getMissingResources(city);
        if(this.BestCost != null && this.BestCost <= currentCost){
            return;
        }
        if(!missingResources.length){
            if(this.BestCost === null || this.BestCost > currentCost)
            this.BestCost = currentCost;
            this.BestRoads = Object.assign({}, moveHistory);
            return;
        }
        missingResources.forEach(missingResource => {
            let bestHistoryByResource = city.BestHistoryByResource[missingResource];
            bestHistoryByResource.forEach(bestHistory => {
                moveHistory.push(bestHistory);
                this._findBestRoadsCombination(city, bestHistory.City, currentCost + bestHistory.Cost, moveHistory);
                moveHistory.pop();
                city.ConnectedCities.pop();
            });
        });
    }

    _destroyAllRoads(){
        this.Map.Tiles.forEach(tilesRow => {
            tilesRow.filter(t => t.HaveRoad).map(t => t.destroyRoad());
        })
    }

    _getShortestRoad(currentCoordinates, targetCoordinates, road, cost, canDraw){
        let nextMove = this._defineShortestDirection(currentCoordinates, targetCoordinates);
        if(this._isArrivedToCity(nextMove, targetCoordinates)){
            return {
                Cost: cost + this.Map._getCoordinateCost(targetCoordinates),
                Road: road
            };
        }
        if(canDraw)
            this.Map.Tiles[currentCoordinates.Row][currentCoordinates.Column].buildRoad();
        cost += this.Map._getCoordinateCost(nextMove);
        road.push(nextMove);
        return this._getShortestRoad(nextMove, targetCoordinates, road, cost, canDraw);
    }

    _getLowestCostRoad(currentCoordinates, targetCoordinates, lastMove, moveHistory, currentCost){
        let topPoint = this._moveTop(currentCoordinates.Column, currentCoordinates.Row);
        if(lastMove != LastMoveEnum.Bottom){
            this._handleMoveToPoint(topPoint, targetCoordinates, LastMoveEnum.Top, moveHistory, currentCost);
        }

        let topRightPoint = this._moveTopRight(currentCoordinates.Column, currentCoordinates.Row);
        if(lastMove != LastMoveEnum.BottomLeft){
            this._handleMoveToPoint(topRightPoint, targetCoordinates, LastMoveEnum.TopRight, moveHistory, currentCost);
        }

        let bottomRightPoint = this._moveBottomRight(currentCoordinates.Column, currentCoordinates.Row);
        if(lastMove != LastMoveEnum.TopLeft){
            this._handleMoveToPoint(bottomRightPoint, targetCoordinates, LastMoveEnum.BottomRight, moveHistory, currentCost);
        }

        let bottomPoint = this._moveBottom(currentCoordinates.Column, currentCoordinates.Row); 
        if(lastMove != LastMoveEnum.Top){
            this._handleMoveToPoint(bottomPoint, targetCoordinates, LastMoveEnum.Bottom, moveHistory, currentCost);
        }

        let bottomLeftPoint = this._moveBottomLeft(currentCoordinates.Column, currentCoordinates.Row); 
         if(lastMove != LastMoveEnum.TopRight){
            this._handleMoveToPoint(bottomLeftPoint, targetCoordinates, LastMoveEnum.BottomLeft, moveHistory, currentCost);
        }

        let topLeftPoint = this._moveTopLeft(currentCoordinates.Column, currentCoordinates.Row);
        if(lastMove != LastMoveEnum.BottomRight){
            this._handleMoveToPoint(topLeftPoint, targetCoordinates, LastMoveEnum.TopLeft, moveHistory, currentCost);
        }
    }

    _handleMoveToPoint(point, targetCoordinates, lastMoveEnum, moveHistory, currentCost){
        if(this._isArrivedToCity(point, targetCoordinates)){
            let NextCost = currentCost + this.Map._getCoordinateCost(targetCoordinates);
            if(this.BestCost > NextCost){
                this.BestCost = NextCost;
                this.BestRoads = Object.assign({}, moveHistory);
            }
            return;
        }
        if(this._canMoveToPoint(point, targetCoordinates, currentCost, moveHistory)){
            let targetTile = this.Map.Tiles[point.Row][point.Column];
            targetTile.buildRoad();
            moveHistory.push(point);
            
            this._getLowestCostRoad(point, targetCoordinates, lastMoveEnum, moveHistory, currentCost += targetTile.Terrain.Cost);

            moveHistory.pop();
            targetTile.destroyRoad();
        }
    }

    _canMoveToPoint(point, targetCoordinates, currentCost, moveHistory){
        return !this.Map._isInvalidRange(point) &&
         this.Map._getCoordinateCost(point) + currentCost < this.BestCost &&
         !moveHistory.map(move => move.Row === point.Row && move.Column === point.Column).includes(true) &&
         this._getShortestRoad(point, targetCoordinates, [], 0, false).Road.length + currentCost < this.BestCost;
    }

    _isArrivedToCity(currentCoordinates, targetCoordinates){
        return currentCoordinates.Column == targetCoordinates.Column 
        && currentCoordinates.Row == targetCoordinates.Row;
    }

    _defineShortestDirection(sourceCoordinates, targetCoordinates){
        if(sourceCoordinates.Column > targetCoordinates.Column){
            if(sourceCoordinates.Row > targetCoordinates.Row){
                return this._moveTopLeft(sourceCoordinates.Column, sourceCoordinates.Row);
            }
            else if(sourceCoordinates.Row < targetCoordinates.Row){
                return this._moveBottomLeft(sourceCoordinates.Column, sourceCoordinates.Row);
            }
            else if(sourceCoordinates.Row == targetCoordinates.Row){
                return this._moveLeft(sourceCoordinates.Column, sourceCoordinates.Row);
            }
        }
        else if(sourceCoordinates.Column < targetCoordinates.Column){
            if(sourceCoordinates.Row > targetCoordinates.Row){
                return this._moveTopRight(sourceCoordinates.Column, sourceCoordinates.Row);
            }
            else if(sourceCoordinates.Row < targetCoordinates.Row){
                return this._moveBottomRight(sourceCoordinates.Column, sourceCoordinates.Row);
            }
            else if(sourceCoordinates.Row == targetCoordinates.Row){
                return this._moveRight(sourceCoordinates.Column, sourceCoordinates.Row);
            }
        }
        else{
            if(sourceCoordinates.Row > targetCoordinates.Row){
                return this._moveTop(sourceCoordinates.Column, sourceCoordinates.Row);
            }
            else if(sourceCoordinates.Row < targetCoordinates.Row){
                return this._moveBottom(sourceCoordinates.Column, sourceCoordinates.Row);
            }
        }
    }

    _getCitiesByResource(resource){
        return this.Cities.filter(city => city.Resources.map(resource => resource.Type).includes(resource));
    }

    _getCityResrouces(city){
        let cityResources = [];
        if(city.Resources){
            city.Resources.forEach(resource=>{
                cityResources.push(resource);
            });
        }
        return cityResources;  
    }

    _getConnectedCitiesResources(city){
        let cityResources = [];
        if(city.ConnectedCities){
            city.ConnectedCities.forEach(connectedCity => {
                if(connectedCity.Resources){
                    connectedCity.Resources.forEach(resource => {
                        cityResources.push(resource);
                    });
                }
            });
        }
        return cityResources;
    }

    _getMissingResources(city){
        let resourceTypes = Object.keys(ResourceTypeEnum);

        let cityResources = this._getCityResrouces(city);
        let connectedCitiesResources = this._getConnectedCitiesResources(city);
        let allCityResources = cityResources.concat(connectedCitiesResources);

        if(allCityResources.length){
            allCityResources = new Set([...allCityResources]);
            allCityResources.forEach(resource => {
                for(let i=0 ; i < resourceTypes.length ; i++){
                    if(resourceTypes[i] === resource.Type){
                        resourceTypes.splice(i, 1);
                        break;
                    }
                }
                if(!resourceTypes.length)
                    return resourceTypes;
            });
        }
        return resourceTypes;
    }

    
    _moveTop(currentColumn, currentRow){
        let destRow = currentRow - 1;
        return new Coordinates(currentColumn, destRow);
    }

    _moveBottom(currentColumn, currentRow){
        let destRow = currentRow + 1;
        return new Coordinates(currentColumn, destRow);
    }
    
    _moveLeft(currentColumn, currentRow){
        let destColumn = currentColumn - 1;
        return new Coordinates(destColumn, currentRow);
    }

    _moveRight(currentColumn, currentRow){
        let destColumn = currentColumn + 1;
        return new Coordinates(destColumn, currentRow);
    }

    _moveTopLeft(currentColumn, currentRow){
        let destRow = currentColumn % 2 ?  currentRow : currentRow - 1;
        let destColumn = currentColumn - 1;
        return new Coordinates(destColumn, destRow);
    }

    _moveTopRight(currentColumn, currentRow){
        let destRow = currentColumn % 2 ?  currentRow : currentRow - 1;
        let destColumn = currentColumn + 1;
        return new Coordinates(destColumn, destRow);
    }

    _moveBottomLeft(currentColumn, currentRow){
        let destRow = currentColumn % 2 ? currentRow + 1 : currentRow;
        let destColumn = currentColumn - 1;
        return new Coordinates(destColumn, destRow);
    }

    _moveBottomRight(currentColumn, currentRow){
        let destRow = currentColumn % 2 ? currentRow + 1 : currentRow;
        let destColumn = currentColumn + 1;
        return new Coordinates(destColumn, destRow);
    }
}

class InputSerializer{
    constructor(){
    }

    serialize(inputType, input){
        switch(inputType){
            case InputTypeEnum.Terrains:
                return this._serializeTerrainsObject(input);
            case InputTypeEnum.Cities:
                return this._serializeCitiesObject(input);
        }
    }

    _serializeTerrainsObject(input){
        let terrainTypes = Object.keys(TerrainTypeEnum);
        let terrainsTable = [];
        let columns = input.trim().split("],");
        columns.forEach(column => {
            let terrainsColumns = [];
            let terrainTypesText = column.trim().substring(1).split(", ");
            terrainTypesText.forEach(terrainTypeText => {
                for(let i=0 ; i < terrainTypes.length ; i++){
                    if(terrainTypes[i].toLowerCase() === terrainTypeText){
                        terrainsColumns.push(new Terrain(terrainTypes[i], parseInt(TerrainTypeEnum[terrainTypes[i]])));
                        break;
                    }
                }
            });
            if(terrainsColumns.length)
                terrainsTable.push(terrainsColumns);
        });
        return terrainsTable;
    }

    _serializeCitiesObject(input){
        let resourceTypes = Object.keys(ResourceTypeEnum);
        let citiesTable = [];
        let cities = input.trim().split("\n");
        cities.forEach(row => {
            let citiesInfo = row.trim().split("), ");
            let coordinates = citiesInfo[0].split(", ");
            let cityResources = [];
            let cityResourcesTexts = citiesInfo[1].split(", ");
            cityResourcesTexts.forEach(cityResourceText => {
                for(let i=0 ; i < resourceTypes.length ; i++){
                    if(resourceTypes[i] === cityResourceText){
                        cityResources.push(new Resource(resourceTypes[i]));
                        break;
                    }
                }
            })
            citiesTable.push(new City(cityResources, new Coordinates(parseInt(coordinates[0].substring(1)), parseInt(coordinates[1]))));
        });
        return citiesTable;
    }
}

class Map{
    constructor(){
        this.Tiles = [];
        this.DOMObj = null;
    }

    _addTilesRow(tilesRow){
        this.Tiles.push(tilesRow);
    }

    _buildDOMObj(){
        let div = document.createElement("div");
        this.DOMObj = div;
    }

    _isInvalidRange(currentCoordinates){
        return currentCoordinates.Column < 0 
        || currentCoordinates.Column >= this.Tiles[0].length 
        || currentCoordinates.Row < 0 
        || currentCoordinates.Row >= this.Tiles.length;
    }

    _getCoordinateCost(coordinate){
        return this.Tiles[coordinate.Row][coordinate.Column].Terrain.Cost;
    }
}


class Tile{
    constructor(terrain){
        this.Terrain = terrain;
        this.City = null;
        this.DOMObj = null;
        this.HaveRoad = null;
    }

    buildRoad(){
        this.HaveRoad = true;
        this.DOMObj.classList.add("have-road");
    }

    destroyRoad(){
        this.HaveRoad = false;
        this.DOMObj.classList.remove("have-road");
    }

    _buildDOMObj(){
        let hex = document.createElement("div");
        hex.classList = "hex";

        let left = document.createElement("div");
        left.className = "left";
        left.style.borderRight = "30px solid " +  this._getTerrainTexture();
        hex.appendChild(left);

        let middle = document.createElement("div");
        middle.className = "middle";
        middle.style.background =  this._getTerrainTexture();
        hex.appendChild(middle);
        
        let right = document.createElement("div");
        right.className = "right";
        right.style.borderLeft = "30px solid " + this._getTerrainTexture();
        hex.appendChild(right);

        this.DOMObj = hex;
    }

    _getTerrainTexture(){
        switch(this.Terrain.Type){
            case "Mountain": 
                return "#8c4318";
            case "Wood":
                return "#658c18";
            case "Open":
                return "#6C6";
            case "Swamp":
                return "#808c18";
            case "Desert":
                return "#ccc966";
        }
    }
}

class Coordinates{
    constructor(column, row){
        this.Column = column;
        this.Row = row;
    }
}

class City{
    constructor(resources, coordinates){
        this.Resources = resources;
        this.Coordinates = coordinates;
        this.ConnectedCities = [];
        this.BestHistoryByResource = [];
    }
}

class Resource{
    constructor(type){
        this.Type = type;
    }
}

class Terrain{
    constructor(type, cost){
        this.Type = type;
        this.Cost = cost;
    }
}

var InputTypeEnum = {
    Terrains: 0,
    Cities: 1
}

var ResourceTypeEnum = {
    Produce:0,
    Wood:1,
    Stone:2,
    Clay:3,
    Ore:4,
    Textile:5
}

var TerrainTypeEnum = {
    Mountain: 6,
    Wood: 2,
    Open: 1,
    Swamp: 4,
    Desert: 7
}

var LastMoveEnum = {
    Top:0,
    TopRight:1,
    BottomRight:2,
    Bottom:3,
    BottomLeft:4,
    TopLeft:5
}
