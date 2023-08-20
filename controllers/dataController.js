const Event = require('../models/dataModel')

exports.insertData = async (req, res) => {
  const eventPayload = req.body;
  // console.log(eventPayload);

  try {
    // Convert the given timestamp to the desired format
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
}

exports.getData = async (req, res) => {
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
    console.log(opensByCountriesResults)
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
            desktop: '$user_agent_parsed.is_desktop'
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

    // Calculate friendly_from email count and array
    const friendlyFromPipeline = [
      {
        $group: {
          _id: '$friendly_from',
          count: { $sum: 1 },
        },
      },
    ];
    const friendlyFromResults = await Event.aggregate(friendlyFromPipeline);
    //  console.log(friendlyFromResults);
    const friendlyFrom = friendlyFromResults.map(result => ({
      Email: result._id,
      count: result.count
    }));

    // Construct and send the metrics response
    const metrics = {
      opens_by_countries: opensByCountries,
      opens_by_device: opensByDevice,
      timeseries: timeseries,
      friendly_from: friendlyFrom
    };
    res.json(metrics);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching metrics');
  }
}

exports.getData2 = async (req, res) => {
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
}