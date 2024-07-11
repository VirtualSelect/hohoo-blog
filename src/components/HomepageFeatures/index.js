import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
    {
        title: 'Java后端开发工程师',
        Svg: require('@site/static/svg/undraw_web_developer.svg').default,
        description: (
            <>
                普普通通Java后端开发工程师一枚，有代码强迫症。
            </>
        ),
    },
    {
        title: '技术狂热者',
        Svg: require('@site/static/svg/undraw_spider.svg').default,
        description: (
            <>
                喜欢研究新技术。
            </>
        ),
    },
    {
        title: '开源爱好者',
        Svg: require('@site/static/svg/undraw_open_source.svg').default,
        description: (
            <>
                希望积极参与开源社区，为开源项目贡献代码。
            </>
        ),
    },
];

function Feature({Svg, title, description}) {
    return (
        <div className={clsx('col col--4')}>
            <div className="text--center">
                <Svg className={styles.featureSvg} role="img"/>
            </div>
            <div className="text--center padding-horiz--md">
                <Heading as="h3">{title}</Heading>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function HomepageFeatures() {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
