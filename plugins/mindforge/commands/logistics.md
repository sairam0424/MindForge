---
name: "mindforge:logistics"
description: "Design logistics optimization system. Usage: /mindforge:logistics [component] [--type routing|warehouse|delivery]"
argument-hint: "[component] [--type routing|warehouse|delivery]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Designs logistics and supply chain optimization systems for route planning, warehouse management, and last-mile delivery. Produces architectures for vehicle routing algorithms, inventory optimization, real-time tracking, and delivery orchestration with cost and time efficiency goals.
</objective>

<execution_context>
@.mindforge/skills/logistics-optimization/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/logistics-optimization/`
State: Evaluates logistics optimization requirements, operational constraints, and produces architecture with route planning algorithms, warehouse automation integration, real-time tracking, and dynamic dispatch systems.
</context>

<process>
1. **Domain Analysis**: Identify logistics scope (last-mile delivery, long-haul trucking, warehouse fulfillment, multi-modal shipping) and define optimization objectives (minimize cost, delivery time, carbon footprint), constraints (vehicle capacity, driver hours, time windows), and scale (orders/day, fleet size).
2. **Route Optimization**: Design vehicle routing system with constraint satisfaction algorithms (VRP, CVRP with time windows), real-time route recalculation for dynamic orders, traffic-aware routing with ETA prediction, and multi-stop optimization considering driver shifts and vehicle capacity.
3. **Warehouse Management Integration**: Architect WMS integration for order allocation to warehouses based on inventory availability and proximity, pick-pack-ship workflow orchestration, barcode/RFID tracking for package movement, and automated sorting system coordination.
4. **Real-Time Tracking**: Implement GPS tracking for delivery vehicles with position updates, geofencing for delivery zone entry/exit events, mobile app for driver navigation and proof-of-delivery (signature, photo), and customer notification system with live tracking links.
5. **Dynamic Dispatch**: Build dispatch system with load balancing across drivers, real-time order insertion into existing routes, driver assignment optimization based on location and capacity, and exception handling for failed deliveries with automatic rescheduling.
6. **Inventory Optimization**: Design inventory forecasting with demand prediction, safety stock calculations, reorder point automation, and multi-warehouse inventory balancing to reduce stockouts while minimizing holding costs with ABC analysis for prioritization.
7. **Analytics and Reporting**: Create operational dashboards with delivery performance metrics (on-time rate, cost per delivery, vehicle utilization), route efficiency analysis, driver performance tracking, and predictive analytics for demand forecasting and capacity planning.
</process>
