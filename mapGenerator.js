function GenerateMap(size){
    let map = GenerateTerrains(size);
    let cities = GenerateCities(size);
    cities = InsertCitiesResources(cities);
    document.getElementById("Cities").value = CitiesToOutput(cities);
    document.getElementById("Terrains").value = MapToOutput(map);
    return map;
}

function MapToOutput(map){
    let output = "";
    map.forEach(row => {
        output += "[";
        row.forEach(point => {
            output += point.Terrain.toLowerCase() + ", ";
        });
        output = output.slice(0, -2);
        output += "],\n";
    })
    return output;
}

function CitiesToOutput(cities){
    let output = "";
    let resources = Object.keys(ResourceTypeEnum);
    cities.forEach(city => {
        output += "(" + city.Column + ", " + city.Row + ")" + (city.Resources 
        ? city.Resources : ", " + resources[Math.floor(Math.random() * resources.length)]) + "\n";
    });
    return output;
}

function InsertCitiesResources(cities){
    let resources = Object.keys(ResourceTypeEnum);
    resources.forEach(resource => {
        let randomCitiesGetResources = Math.floor(Math.random() * (cities.length - 1)) + 1;
        cities = shuffle(cities);
        for(let i = 0 ; i < randomCitiesGetResources ; i++){
            cities[i].Resources += ", " + resource;
        }
    });
    return cities;
}

function GenerateCities(size){
    let cities = [];
    for(let i = 0 ; i < size ; i++){
        let column, row;
        do{
            column = Math.floor(Math.random() * size);
            row = Math.floor(Math.random() * size);
        }while(cities.map(c => c.Row == row && c.Column == column).includes(true));
        cities.push(new GenCity(column, row));
    }
    return cities;
}

function GenerateTerrains(size){
    let map = [];
    let terrains = Object.keys(TerrainTypeEnum);
    for(let i = 0 ; i < size ; i++){
        let row = [];
        for(let y = 0 ; y < size ; y++){
            let terrainType = terrains[Math.floor(Math.random() * terrains.length)];
            row.push(new GenPoint(terrainType));
        }
        map.push(row);
    }
    return map;
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

class GenPoint{
    constructor(terrain){
        this.Terrain = terrain;
    }
}

class GenCity{
    constructor(column, row){
        this.Column = column;
        this.Row = row;
        this.Resources = "";
    }
}
