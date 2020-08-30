import { toXML } from 'jstoxml'

function timestampsToXml(timestamps) {

    const xmlOptions = {
      header: false,
      indent: '  '
    };

    const header = {
      _name: 'HEADER',
      _attrs: {
        TIME_UNITS: 'milliseconds'
      },
      _content: { _name: 'MEDIA_DESCRIPTOR' }
    };

    const timeSlots = timestamps.flatMap((timestamp, index) => [{
      _name: 'TIME_SLOT',
      _attrs: {
        TIME_SLOT_ID: 'TSP_START' + (index + 1),
        TIME_VALUE: timestamp.startTime
      }
    },
    {
      _name: 'TIME_SLOT',
      _attrs: {
        TIME_SLOT_ID: 'TSP_END' + (index + 1),
        TIME_VALUE: timestamp.endTime
      }
    }

    ]);

    const segmentAnnotations = timestamps.map((timestamp, index)=>({
        ANNOTATION: {
          _name: 'ALIGNABLE_ANNOTATION',
          _attrs: {
              ANNOTATION_ID: 'SEGMENT' + (index + 1),
              TIME_SLOT_REF1: 'TSP_START' + (index + 1),
              TIME_SLOT_REF2: 'TSP_END' + (index + 1)
          },
          _content: {
          	ANNOTATON_VALUE: timestamp.speaker
          } 
        }

    }));

    const speakerAnnotations = timestamps.map((timestamp, index)=>({
        ANNOTATION: {
          _name: 'REF_ANNOTATION',
          _attrs: {
              ANNOTATION_ID: 'SPEAKER' + (index + 1),
              ANNOTATION_REF: 'SEGMENT' + (index + 1)
          },
          _content: {
          	ANNOTATON_VALUE: timestamp.speaker
          } 
        }

    }));

    const transcriptAnnotations = timestamps.map((timestamp, index)=>({
        ANNOTATION: {
          _name: 'REF_ANNOTATION',
          _attrs: {
              ANNOTATION_ID: 'TRANSCRIPT' + (index + 1),
              ANNOTATION_REF: 'SEGMENT' + (index + 1)
          },
          _content: {
          	ANNOTATON_VALUE: ''
          } 
        }

    }));

    const xmlString = toXML({
      	ANNOTATION_DOCUMENT: [
                              	header,
                              	{ 	
                              		TIME_ORDER: timeSlots
                              	},
                              	{ 	_name: 'TIER',
                                	_attrs: {
                                       	TIER_ID: 'Segment'
                                    },
                                	_content: segmentAnnotations
                              	},
                              	{ 	_name: 'TIER',
                                	_attrs: {
                                        TIER_ID: 'Speaker'
                                    },
                                	_content: speakerAnnotations
                              	},
                              	{	
                              		_name: 'TIER',
                                	_attrs: {
                                        TIER_ID: 'Transcript'
                                    },
                                	_content: transcriptAnnotations
                              	}
                            ]
    }, xmlOptions);

    return xmlString;
}

export default {
	timestampsToXml: timestampsToXml
}
