import {browserHistory} from 'react-router';

import {enforceActOnUseLegacyStoreHook, mountWithTheme} from 'sentry-test/enzyme';
import {initializeOrg} from 'sentry-test/initializeOrg';
import {act} from 'sentry-test/reactTestingLibrary';

import ProjectsStore from 'sentry/stores/projectsStore';
import {OrganizationContext} from 'sentry/views/organizationContext';
import TransactionTags from 'sentry/views/performance/transactionSummary/transactionTags';

function initializeData({query} = {query: {}}) {
  const features = ['discover-basic', 'performance-view'];
  const organization = TestStubs.Organization({
    features,
    projects: [TestStubs.Project()],
  });
  const initialData = initializeOrg({
    organization,
    router: {
      location: {
        query: {
          transaction: 'Test Transaction',
          project: '1',
          ...query,
        },
      },
    },
  });
  act(() => ProjectsStore.loadInitialData(initialData.organization.projects));
  return initialData;
}

const WrappedComponent = ({organization, ...props}) => {
  return (
    <OrganizationContext.Provider value={organization}>
      <TransactionTags organization={organization} {...props} />
    </OrganizationContext.Provider>
  );
};

describe('Performance > Transaction Tags', function () {
  enforceActOnUseLegacyStoreHook();

  let histogramMock;
  let wrapper;

  beforeEach(function () {
    browserHistory.replace = jest.fn();
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/projects/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/tags/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/tags/user.email/values/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-facets-performance/',
      body: {
        meta: {
          tags_key: 'string',
          tags_value: 'string',
          sumdelta: 'duration',
          count: 'integer',
          frequency: 'number',
          comparison: 'number',
          aggregate: 'number',
        },
        data: [
          {
            tags_key: 'hardwareConcurrency',
            tags_value: '4',
            sumdelta: 45773.0,
            count: 83,
            frequency: 0.05,
            comparison: 1.45,
            aggregate: 2000.5,
          },
          {
            tags_key: 'effectiveConnectionType',
            tags_value: '4g',
            sumdelta: 45773.0,
            count: 83,
            frequency: 0.05,
            comparison: 1.45,
            aggregate: 2000.5,
          },
        ],
      },
    });
    histogramMock = MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-facets-performance-histogram/',
      body: {
        meta: {
          count: 'integer',
          histogram_measurements_lcp_120_360_1: 'number',
          tags_key: 'string',
          tags_value: 'string',
        },
        data: [
          {
            histogram_measurements_lcp_120_360_1: 600,
            tags_value: '4',
            tags_key: 'hardwareConcurrency',
            count: 3,
          },
        ],
      },
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-has-measurements/',
      body: {measurements: false},
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/sdk-updates/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/prompts-activity/',
      body: {},
    });
  });

  afterEach(function () {
    wrapper.unmount();
    histogramMock.mockReset();
    MockApiClient.clearMockResponses();
    act(() => ProjectsStore.reset());
  });

  it('renders basic UI elements', async function () {
    const initialData = initializeData();
    wrapper = mountWithTheme(
      <WrappedComponent
        organization={initialData.organization}
        location={initialData.router.location}
      />,
      initialData.routerContext
    );

    await tick();
    await tick();
    wrapper.update();

    // It shows the sidebar
    expect(wrapper.find('TagsPageContent')).toHaveLength(1);

    // It shows the header
    expect(wrapper.find('TransactionHeader')).toHaveLength(1);

    // It shows the tag display
    expect(wrapper.find('TagsDisplay')).toHaveLength(1);

    expect(browserHistory.replace).toHaveBeenCalledWith({
      query: {
        project: '1',
        statsPeriod: '14d',
        tagKey: 'hardwareConcurrency',
        transaction: 'Test Transaction',
      },
    });

    // It shows a table
    expect(wrapper.find('GridEditable')).toHaveLength(1);

    // It shows the tag chart
    expect(wrapper.find('TagsHeatMap')).toHaveLength(1);
  });

  it('Default tagKey is set when loading the page without one', async function () {
    const initialData = initializeData();
    wrapper = mountWithTheme(
      <WrappedComponent
        organization={initialData.organization}
        location={initialData.router.location}
      />,
      initialData.routerContext
    );

    await tick();
    await tick();
    wrapper.update();

    // Table is loaded.
    expect(wrapper.find('GridEditable')).toHaveLength(1);

    expect(browserHistory.replace).toHaveBeenCalledWith({
      query: {
        project: '1',
        statsPeriod: '14d',
        tagKey: 'hardwareConcurrency',
        transaction: 'Test Transaction',
      },
    });

    expect(histogramMock).toHaveBeenCalledTimes(1);
    expect(histogramMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        query: expect.objectContaining({
          statsPeriod: '14d',
          tagKey: 'hardwareConcurrency',
        }),
      })
    );
  });

  it('Passed tagKey gets used when calling queries', async function () {
    const initialData = initializeData({query: {tagKey: 'effectiveConnectionType'}});

    wrapper = mountWithTheme(
      <WrappedComponent
        organization={initialData.organization}
        location={initialData.router.location}
      />,
      initialData.routerContext
    );

    await tick();
    await tick();
    wrapper.update();

    // Table is loaded.
    expect(wrapper.find('GridEditable')).toHaveLength(1);

    expect(browserHistory.replace).toHaveBeenCalledWith({
      query: {
        project: '1',
        statsPeriod: '14d',
        tagKey: 'effectiveConnectionType',
        transaction: 'Test Transaction',
      },
    });

    expect(histogramMock).toHaveBeenCalledTimes(1);
    expect(histogramMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        query: expect.objectContaining({
          statsPeriod: '14d',
          tagKey: 'effectiveConnectionType',
        }),
      })
    );
  });
});
