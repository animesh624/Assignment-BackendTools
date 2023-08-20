const express = require('express');
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
require('dotenv').config()
const connectDatabase=require('./config/database');
connectDatabase();

const Event=require('./models/dataModel')

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

  app.get('/agg', async (req, res) => {
    try {
      const events = await Event.find();
  
      // Calculate opens by countries
      const opensByCountriesPipeline = [
        {
          $group: {
            _id: '$geo_ip.country',
            count: { $sum: 1 },
          },
        },
      ];
      const opensByCountriesResults = await Event.aggregate(opensByCountriesPipeline);
      const opensByCountries = {};
      opensByCountriesResults.forEach(result => {
        opensByCountries[result._id] = result.count;
      });
  
      // Calculate opens by device
      const opensByDevicePipeline = [
        {
          $group: {
            _id: {
              mobile: '$user_agent_parsed.is_mobile',
              tablet: '$user_agent_parsed.is_tablet',
            },
            count: { $sum: 1 },
          },
        },
      ];
      const opensByDeviceResults = await Event.aggregate(opensByDevicePipeline);
      const opensByDevice = { desktop: 0, mobile: 0, tablet: 0 };
      opensByDeviceResults.forEach(result => {
        if (result._id.mobile) opensByDevice.mobile = result.count;
        else if (result._id.tablet) opensByDevice.tablet = result.count;
        else opensByDevice.desktop = result.count;
      });
  
      // Calculate timeseries
      const timeseriesPipeline = [
        {
          $group: {
            _id: '$injection_time',
            count: { $sum: 1 },
          },
        },
      ];
      const timeseriesResults = await Event.aggregate(timeseriesPipeline);
      const timeseries = timeseriesResults.map(result => ({
        totalOpens: result.count,
        time: result._id,
      }));
  
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
