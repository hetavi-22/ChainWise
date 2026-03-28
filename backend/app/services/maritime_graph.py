import networkx as nx
import math
from app.services.routing import haversine

# Graph Nodes (id -> (lat, lon, label, countries, is_chokepoint))
MARITIME_NODES = {
    # Asia / Indian Ocean
    "arabian_sea": (15.0, 65.0, "Arabian Sea", ["International Waters"], False),
    "sri_lanka_south": (4.5, 80.5, "South of Sri Lanka", ["Sri Lanka", "India"], False),
    "bay_of_bengal": (10.0, 88.0, "Bay of Bengal", ["India", "Myanmar", "Bangladesh"], False),
    "andaman_sea": (10.0, 94.0, "Andaman Sea", ["Thailand", "Myanmar"], False),
    "malacca_n": (5.5, 98.5, "Strait of Malacca (North)", ["Indonesia", "Malaysia", "Thailand"], True),
    "malacca_s": (1.3, 103.8, "Strait of Malacca (South)", ["Singapore", "Malaysia", "Indonesia"], True),
    "south_china_sea": (10.0, 113.0, "South China Sea", ["International Waters"], False),
    "east_china_sea": (25.0, 122.0, "East China Sea", ["China", "Taiwan", "Japan"], False),
    "japan_sea": (35.0, 135.0, "Sea of Japan", ["Japan", "South Korea"], False),
    
    # Pacific
    "north_pacific": (40.0, 175.0, "North Pacific Ocean", ["International Waters"], False),
    "us_west_coast": (34.0, -125.0, "Pacific Approach (US West)", ["USA", "Mexico"], False),
    
    # Middle East / Africa
    "oman_gulf": (24.0, 59.0, "Gulf of Oman", ["Oman", "UAE", "Iran"], False),
    "horn_africa": (11.5, 51.0, "Horn of Africa", ["Somalia"], False),
    "bab_el_mandeb": (12.6, 43.5, "Bab-el-Mandeb", ["Djibouti", "Yemen", "Eritrea"], True),
    "red_sea": (20.0, 38.0, "Red Sea", ["Saudi Arabia", "Sudan", "Egypt"], False),
    "suez": (31.0, 32.3, "Suez Canal", ["Egypt"], True),
    "cape_hope": (-35.0, 20.0, "Cape of Good Hope", ["South Africa"], False),
    "west_africa": (0.0, -10.0, "Gulf of Guinea / West Africa", ["Equatorial Guinea", "Nigeria"], False),
    
    # Europe
    "east_med": (34.0, 25.0, "Eastern Mediterranean", ["Greece", "Cyprus", "Egypt"], False),
    "central_med": (36.0, 15.0, "Central Mediterranean", ["Italy", "Malta", "Tunisia"], False),
    "west_med": (39.0, 5.0, "Western Mediterranean", ["Spain", "Algeria", "France"], False),
    "gibraltar": (35.9, -5.6, "Strait of Gibraltar", ["Spain", "Morocco", "UK (Gibraltar)"], True),
    "iberia_coast": (39.0, -10.0, "Iberian Atlantic Coast", ["Portugal", "Spain"], False),
    "biscay": (45.5, -6.0, "Bay of Biscay", ["France", "Spain"], False),
    "english_channel": (50.5, 0.5, "English Channel", ["UK", "France"], True),
    "north_sea": (54.0, 3.5, "North Sea", ["Netherlands", "UK", "Germany"], False),
    
    # Americas
    "us_east_coast": (35.0, -72.0, "Atlantic Approach (US East)", ["USA"], False),
    "caribbean": (15.0, -75.0, "Caribbean Sea", ["International Waters"], False),
    "panama_atl": (9.4, -79.9, "Panama Canal (Atlantic)", ["Panama"], True),
    "panama_pac": (8.9, -79.5, "Panama Canal (Pacific)", ["Panama"], True),
    "peru_basin": (-10.0, -85.0, "Peru Basin", ["Peru", "Ecuador"], False),
    "brazil_basin": (-15.0, -35.0, "Brazil Basin", ["Brazil"], False)
}

# Define safe sea-corridor connections (edges)
MARITIME_EDGES = [
    # Asia internally
    ("arabian_sea", "sri_lanka_south"),
    ("sri_lanka_south", "bay_of_bengal"),
    ("bay_of_bengal", "andaman_sea"),
    ("sri_lanka_south", "andaman_sea"),
    ("andaman_sea", "malacca_n"),
    ("malacca_n", "malacca_s"),
    ("malacca_s", "south_china_sea"),
    ("south_china_sea", "east_china_sea"),
    ("east_china_sea", "japan_sea"),
    
    # Middle East
    ("arabian_sea", "oman_gulf"),
    ("arabian_sea", "horn_africa"),
    ("horn_africa", "bab_el_mandeb"),
    ("bab_el_mandeb", "red_sea"),
    ("red_sea", "suez"),
    
    # Europe
    ("suez", "east_med"),
    ("east_med", "central_med"),
    ("central_med", "west_med"),
    ("west_med", "gibraltar"),
    ("gibraltar", "iberia_coast"),
    ("iberia_coast", "biscay"),
    ("biscay", "english_channel"),
    ("english_channel", "north_sea"),
    ("gibraltar", "west_africa"),
    ("iberia_coast", "us_east_coast"), # Transatlantic
    ("gibraltar", "us_east_coast"),
    
    # Africa
    ("horn_africa", "cape_hope"),
    ("cape_hope", "west_africa"),
    ("west_africa", "brazil_basin"),
    
    # Pacific / Americas
    ("east_china_sea", "north_pacific"),
    ("japan_sea", "north_pacific"),
    ("north_pacific", "us_west_coast"),
    ("us_west_coast", "panama_pac"),
    ("panama_pac", "peru_basin"),
    ("us_west_coast", "peru_basin"),
    ("panama_pac", "panama_atl"),
    ("panama_atl", "caribbean"),
    ("caribbean", "us_east_coast"),
    ("caribbean", "brazil_basin")
]

# Build graph with Haversine weights
G = nx.Graph()
for node_id, (lat, lon, label, countries, is_chokepoint) in MARITIME_NODES.items():
    G.add_node(node_id, lat=lat, lon=lon, label=label, countries=countries, is_chokepoint=is_chokepoint)

for u, v in MARITIME_EDGES:
    lat1, lon1 = MARITIME_NODES[u][:2]
    lat2, lon2 = MARITIME_NODES[v][:2]
    dist = haversine(lat1, lon1, lat2, lon2)
    G.add_edge(u, v, weight=dist)

def get_maritime_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float):
    """
    Connects origin and dest to the nearest maritime nodes,
    runs A* pathfinding, and returns a list of dictionaries 
    representing the legs between each graph node.
    """
    # Find nearest origin node
    best_o, min_d_o = None, float('inf')
    for n, data in G.nodes(data=True):
        d = haversine(origin_lat, origin_lon, data['lat'], data['lon'])
        if d < min_d_o:
            min_d_o = d
            best_o = n

    # Find nearest dest node
    best_d, min_d_d = None, float('inf')
    for n, data in G.nodes(data=True):
        d = haversine(dest_lat, dest_lon, data['lat'], data['lon'])
        if d < min_d_d:
            min_d_d = d
            best_d = n

    if not best_o or not best_d:
        return []

    try:
        path = nx.shortest_path(G, source=best_o, target=best_d, weight='weight')
    except nx.NetworkXNoPath:
        return []

    legs = []
    # Port to first node
    first_node = G.nodes[path[0]]
    legs.append({
        'from_name': "Origin Port Area",
        'from_lat': origin_lat, 'from_lon': origin_lon,
        'from_is_chokepoint': False,
        'to_name': first_node['label'],
        'to_lat': first_node['lat'], 'to_lon': first_node['lon'],
        'to_is_chokepoint': first_node['is_chokepoint'],
        'countries': first_node['countries']
    })

    # Node to node
    for i in range(len(path) - 1):
        u_data = G.nodes[path[i]]
        v_data = G.nodes[path[i+1]]
        legs.append({
            'from_name': u_data['label'],
            'from_lat': u_data['lat'], 'from_lon': u_data['lon'],
            'from_is_chokepoint': u_data['is_chokepoint'],
            'to_name': v_data['label'],
            'to_lat': v_data['lat'], 'to_lon': v_data['lon'],
            'to_is_chokepoint': v_data['is_chokepoint'],
            'countries': v_data['countries']
        })
        
    # Last node to Port
    last_node = G.nodes[path[-1]]
    legs.append({
        'from_name': last_node['label'],
        'from_lat': last_node['lat'], 'from_lon': last_node['lon'],
        'from_is_chokepoint': last_node['is_chokepoint'],
        'to_name': "Destination Port Area",
        'to_lat': dest_lat, 'to_lon': dest_lon,
        'to_is_chokepoint': False,
        'countries': []
    })

    return legs
