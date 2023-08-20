const express = require('express');
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
require('dotenv').config()
const connectDatabase=require('./config/database');
connectDatabase();

// Create a schema and model for events
const eventSchema = new mongoose.Schema({
    ab_test_id: String,
    ab_test_version: String,
    amp_enabled: Boolean,
    campaign_id: String,
    click_tracking: Boolean,
    customer_id: String,
    delv_method: String,
    event_id: String,
    friendly_from: String,
    geo_ip: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      zip: String,
      postal_code: String,
    },
    injection_time: String,
    initial_pixel: Boolean,
    ip_address: String,
    ip_pool: String,
    mailbox_provider: String,
    mailbox_provider_region: String,
    message_id: String,
    msg_from: String,
    msg_size: String,
    num_retries: String,
    open_tracking: Boolean,
    queue_time: String,
    rcpt_meta: {
      customKey: String,
    },
    rcpt_tags: [String],
    rcpt_to: String,
    rcpt_hash: String,
    raw_rcpt_to: String,
    rcpt_type: String,
    recipient_domain: String,
    routing_domain: String,
    scheduled_time: String,
    sending_ip: String,
    subaccount_id: String,
    subject: String,
    template_id: String,
    template_version: String,
    timestamp: String,
    transactional: String,
    transmission_id: String,
    type: String,
    user_agent: String,
    user_agent_parsed: {
      agent_family: String,
      device_brand: String,
      device_family: String,
      os_family: String,
      os_version: String,
      is_mobile: Boolean,
      is_proxy: Boolean,
      is_prefetched: Boolean,
    },
  });
  
const Event = mongoose.model('Event', eventSchema);

// Endpoint to receive real-time analytics events
app.post('/events', async (req, res) => {
    const eventPayload = req.body;
  
    try {
      // Convert the ISO 8601 timestamp to the desired format
      const injectionTime = new Date(eventPayload.injection_time).toLocaleString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
  
      const newEvent = new Event({
        ...eventPayload,
        injection_time: injectionTime,
      });
  
      await newEvent.save();
      res.status(200).send('Event received');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error saving event');
    }
  });

// Endpoint to return aggregated metrics
app.get('/metrics', async (req, res) => {
    try {
      const events = await Event.find();
  
      // Calculate opens by countries
      const opensByCountries = {};
      events.forEach(event => {
        const country = event.geo_ip.country;
        opensByCountries[country] = (opensByCountries[country] || 0) + 1;
      });
  
      // Calculate opens by device
      const opensByDevice = { desktop: 0, mobile: 0, tablet: 0 };
      events.forEach(event => {
        const deviceType = event.user_agent_parsed.is_mobile
          ? 'mobile'
          : event.user_agent_parsed.is_tablet
          ? 'tablet'
          : 'desktop';
        opensByDevice[deviceType]++;
      });
  
      // Calculate timeseries
      const timeseriesMap = new Map();
      events.forEach(event => {
        const injectionTime = event.injection_time;
        if (!timeseriesMap.has(injectionTime)) {
          timeseriesMap.set(injectionTime, 0);
        }
        timeseriesMap.set(injectionTime, timeseriesMap.get(injectionTime) + 1);
      });
  
      const timeseries = [];
      timeseriesMap.forEach((count, injectionTime) => {
        timeseries.push({
          totalOpens: count,
          time: injectionTime,
        });
      });
  
      // Construct and send the metrics response
      const metrics = {
        opens_by_countries: opensByCountries,
        opens_by_device: opensByDevice,
        timeseries: timeseries,
      };
      res.json(metrics);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching metrics');
    }
  });
  
  

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
