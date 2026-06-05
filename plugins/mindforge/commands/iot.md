---
name: "mindforge:iot"
description: "Design IoT platform architecture. Usage: /mindforge:iot [component] [--protocol mqtt|coap|http] [--scale devices]"
argument-hint: "[component] [--protocol mqtt|coap|http] [--scale devices]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Designs IoT platform architectures for device connectivity, telemetry ingestion, command/control, and edge computing. Produces designs for MQTT/CoAP brokers, device management, time-series data storage, real-time analytics, and firmware update systems with support for millions of concurrent devices.
</objective>

<execution_context>
@.mindforge/skills/iot-platform/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/iot-platform/`
State: Evaluates IoT use case, device scale, protocol requirements, and produces architecture with device provisioning, telemetry pipelines, edge processing, and device twin patterns for industrial, consumer, and smart city applications.
</context>

<process>
1. **Use Case Analysis**: Identify IoT domain (industrial monitoring, smart home, connected vehicles, agriculture) and classify device types (sensors, actuators, gateways), communication patterns (telemetry streaming, command/response, firmware updates), and scale (thousands to millions of devices).
2. **Protocol Architecture**: Select communication protocols based on device constraints (MQTT for reliable messaging, CoAP for constrained devices, HTTP/REST for simple integrations), design pub/sub topic hierarchies, and implement protocol gateways for multi-protocol support with TLS encryption.
3. **Device Management**: Design device lifecycle management with secure provisioning (X.509 certificates, token-based auth), device registry with metadata/tags, health monitoring with heartbeat tracking, and bulk operations for fleet management (configuration updates, diagnostics).
4. **Telemetry Ingestion**: Architect high-throughput data ingestion pipeline with MQTT broker clustering (EMQX, HiveMQ), message queuing (Kafka, Pulsar) for decoupling, and time-series database (InfluxDB, TimescaleDB) for sensor data storage with downsampling and retention policies.
5. **Edge Computing**: Implement edge processing with local data filtering/aggregation to reduce bandwidth, edge analytics for real-time anomaly detection, offline operation with store-and-forward capabilities, and edge AI model deployment for predictive maintenance.
6. **Command and Control**: Design bidirectional communication for remote device control with command queuing, acknowledgment patterns, timeout handling, and desired state management using device twin/shadow patterns for eventually consistent configuration.
7. **Analytics and Visualization**: Build real-time dashboards for device status monitoring, streaming analytics for alerting on threshold violations, historical trend analysis, and integration with ML pipelines for predictive analytics using telemetry data.
</process>
